# BlockSubmit

A hybrid Web2/Web3 platform for secure academic document submissions.
Files live in Cloudflare R2, structured data lives in Postgres, and a
Solidity contract on Sepolia records an immutable SHA-256 fingerprint of
each submission — so integrity can be verified independently of the app.

## Architecture

```
┌─────────────┐   presigned URLs    ┌──────────────┐
│   Next.js   │◄────────────────────►│ Cloudflare R2│  (binary files only)
│  App Router │                      └──────────────┘
│  (Vercel)   │
│             │      SHA-256 + IDs   ┌──────────────┐
│  API routes │─────────────────────►│  Solidity     │
│             │                      │  (Sepolia)    │  (fingerprint only,
│             │◄─────────────────────│               │   never the file)
│             │   read for verify    └──────────────┘
│             │
│             │      RLS-enforced    ┌──────────────┐
│             │◄────────────────────►│  Supabase     │
└─────────────┘   queries + auth     │  Postgres+Auth│
                                      └──────────────┘
```

Three data stores, three jobs:
- **Postgres** — structured relational data, relationships, audit logs, RLS.
- **R2** — actual binary files, accessed only via short-lived presigned URLs.
- **Blockchain** — only the fingerprint (fileHash + metadata). The file
  itself never touches the chain.

## Submission state machine

```
UPLOADING → STORED → HASHED → RECORDING → CONFIRMED
    │           │                  │
    ▼           ▼                  ▼
UPLOAD_FAILED HASH_FAILED   BLOCKCHAIN_FAILED (retryable via
                                                PATCH /api/submissions/[id]/retry)
```

Each step updates the `submissions.status` column so the UI always
reflects exactly where a submission is, and a blockchain failure never
loses the uploaded file or its hash — only the on-chain step needs retrying.

## Trust model (why a single server signer)

`SubmissionRegistry.recordSubmission` is gated to a single `owner` address
held server-side. This keeps the demo simple and keys the "who can write"
question to "who can pass RBAC in the app," which mirrors how the rest of
the system already enforces authorization. A production version protecting
against a compromised server would move signing client-side (student or
teacher signs with their own wallet) or use a role-gated multi-signer setup.

## Project structure

```
app/
  api/
    health/                 GET  — DB + R2 + blockchain connectivity check
    assignments/             GET/POST — assignment CRUD
    submissions/              GET/POST — list / create (full upload flow)
      [id]/verify/            POST — recompute hash, compare to on-chain
      [id]/download/          GET  — presigned download URL
      [id]/retry/             PATCH — retry a failed blockchain recording
    grades/                   POST — create/update a grade
  verify/[submissionId]/      Public integrity-proof page (no auth)
  dashboard/student/          Student dashboard
  dashboard/teacher/          Teacher dashboard
  login/ register/            Auth pages
components/                   StatusBadge, SubmissionUploadForm, VerifyIntegrityCard
lib/                          supabase-server, supabase-browser, auth (RBAC),
                               r2, hash, blockchain, audit
types/                        Shared TypeScript types (mirrors DB schema)
supabase/migrations/          0001_init.sql — schema, RLS policies, triggers
                               0002_fix_handle_new_user.sql — hardens the
                               auth.users -> profiles trigger (idempotent,
                               duplicate-safe, pinned search_path)
contracts/                    SubmissionRegistry.sol
scripts/                      deploy.ts (Hardhat)
```

## Setup

1. **Supabase**: create a project, run every file in
   `supabase/migrations/` **in order** (`0001_init.sql` then
   `0002_fix_handle_new_user.sql`) in the SQL editor, or `supabase
   migration up` with the CLI. Copy the project URL, anon key, and
   service role key into `.env`.
2. **Cloudflare R2**: create a bucket, generate an API token with
   read/write access, copy account ID + keys into `.env`.
3. **Blockchain**: get a Sepolia RPC URL (Infura/Alchemy), fund a throwaway
   wallet with Sepolia test ETH, put its private key in `BLOCKCHAIN_PRIVATE_KEY`.
4. Copy `.env.example` to `.env` and fill in all values.

### Deploying the contract

Hardhat is already configured in this repo (`hardhat.config.ts`) — no
manual scaffolding needed. It reads the same environment variable names
the app itself uses:

- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY` — the deployer/signer's private key, funded
  with Sepolia test ETH (get some from a Sepolia faucet — this repo can't
  do that for you)
- `BLOCKCHAIN_CHAIN_ID` (defaults to `11155111`, Sepolia)

```bash
npm install                          # installs hardhat + toolbox, already in package.json
npm run compile                      # npx hardhat compile — compiles SubmissionRegistry.sol
npx hardhat run scripts/deploy.ts    # no --network flag: deploys to Hardhat's built-in
                                      # in-memory network, useful to sanity-check the
                                      # script itself with zero credentials
npm run deploy:sepolia               # npx hardhat run scripts/deploy.ts --network sepolia
                                      # — the real deployment; requires .env filled in
```

`deploy:sepolia` prints the network name/chain ID, the deployer's public
address and balance, and — once mined — the deployed contract address and
deployment transaction hash. It never prints `BLOCKCHAIN_PRIVATE_KEY` or
any other secret. Copy the printed address into `BLOCKCHAIN_CONTRACT_ADDRESS`
in `.env`.

`hardhat.config.ts` is dev-tooling only: it's never imported by anything
under `app/`, `lib/`, or `components/`, and `hardhat` itself is a
`devDependency` — neither ships in the Next.js build or reaches the
browser.

### End-to-end test (once deployed)

With a real Supabase project, R2 bucket, and a Sepolia-deployed contract
address all configured in `.env`:

1. Register a student account, log in.
2. Have a teacher account (promoted via SQL — see "Setup" above) create
   an assignment.
3. As the student, upload a real file on `/student` or the assignment's
   details page.
4. Confirm in Supabase's Table Editor that the `submissions` row reaches
   `status = 'CONFIRMED'` with a non-null `blockchain_tx_hash` and
   `blockchain_block_number`.
5. Confirm the R2 bucket actually contains the object at
   `submissions/{submissionId}/{filename}`.
6. Open the submission's details page and click "Verify Integrity" (or
   visit the public `/verify/[submissionId]` page) — expect **VERIFIED**,
   with the displayed SHA-256 matching what you'd get from running
   `shasum -a 256` on the original file locally.
7. Click the transaction hash's explorer link and confirm the transaction
   is visible on Sepolia Etherscan.

### Tamper test

To see a real **TAMPERED** result (not simulated): after step 6 above,
go into the R2 bucket (dashboard, or `aws s3 cp` / `rclone` pointed at
the R2 S3-compatible endpoint) and overwrite the object at that same key
with a different file's bytes, keeping the same filename/key. Re-run
verification — the recomputed hash will no longer match the on-chain
hash, and the result will be **TAMPERED**. The on-chain record itself is
never touched by this test (the contract has no update path at all —
confirm this yourself by calling `getSubmission` on the contract and
seeing the original hash unchanged).


### Running locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Register a user (defaults to STUDENT role);
promote a user to TEACHER/ADMIN directly in Supabase:

```sql
update profiles set role = 'TEACHER' where id = '<user-uuid>';
```

### Mutation request origins

Authenticated state-changing API requests require an exact same-origin
`Origin` header. In production, set the server-only `APP_ORIGIN` environment
variable to the deployed BlockSubmit origin, for example
`https://blocksubmit.example.com`. Multiple explicitly trusted origins may be
comma-separated when needed. Vercel preview deployments also accept the
platform-provided `VERCEL_URL`; local development permits only loopback
origins on the supported local dev ports. Arbitrary request `Host` or
`Origin` values are never used as configuration.

### Deploying

- Push to GitHub, import into Vercel, set all `.env` vars in the Vercel
  project settings.
- Supabase and R2 need no separate deployment — they're already hosted.

## Security notes

- Every protected route re-derives the user's role from `profiles` via
  `lib/auth.ts` — the frontend's role-based UI is convenience only.
- RLS policies in the migration are a second, independent authorization
  layer at the database level (defense in depth alongside the API checks).
- Files are never served from a permanent URL; every download goes through
  a presigned URL with a 5-minute default TTL, generated only after an
  ownership/role check.
- `audit_logs` is written via the service-role client only — there is no
  client-facing insert policy, so audit entries can't be forged from the
  browser.

## Idempotency strategy (V1)

The failure case that matters most: a blockchain transaction confirms
on-chain, then the server process dies (or the HTTP request times out)
before PostgreSQL is updated to `CONFIRMED`. A naive retry would call
`recordSubmission` again and either waste gas on a reverted tx or, worse,
silently succeed in creating a second on-chain entry if the contract
didn't guard against it.

The chosen strategy layers three things, each doing one job:

1. **Contract-level write-once guard** — `SubmissionRegistry` reverts on
   a second `recordSubmission` call for the same `submissionId`. This is
   the actual source of truth for "has this been recorded" and is what
   ultimately prevents a duplicate record, no matter what the app does.
2. **App-level idempotent recorder** — `recordSubmissionOnChain()` in
   `lib/blockchain.ts` checks `hasRecord()` before sending a transaction.
   If a record already exists, it recovers the original `txHash` /
   `blockNumber` from the `SubmissionRecorded` event log instead of
   sending a new (guaranteed-to-revert) transaction. This makes the
   function itself safe to call repeatedly with the same submission.
3. **DB status as a resumability hint, not a lock** — `RECORDING` and
   `BLOCKCHAIN_FAILED` are both treated as retryable (see
   `RETRYABLE_STATUSES` in `types/index.ts`), because a crash can leave a
   row in either one. The retry endpoint re-enters step 4 of the pipeline
   safely because step (2) above makes it idempotent regardless of which
   of those two states it starts from.

The DB's `UNIQUE(assignment_id, student_id)` constraint handles the
separate case of a retried *upload* request (before any submission row
exists): a second `INSERT` attempt fails with Postgres error `23505`,
and the route returns the existing submission's id/status rather than
creating a duplicate.

## Validated (as of this build)

- `npm run typecheck` (`tsc --noEmit`) — passes, zero errors.
- `npm run lint` (`next lint`, `next/core-web-vitals`) — passes, zero
  warnings.
- `npm run build` (`next build`) — production build succeeds; every
  `api/**` route and `/verify/[submissionId]` correctly compiles to a
  dynamic (`ƒ`) route, not statically prerendered.
- Smoke-tested against a locally started production server with
  placeholder credentials (no real Supabase/R2/chain access): every
  protected route (`/api/assignments` POST, `/api/submissions` POST,
  `.../download`, `.../retry`, `.../verify`, `/api/grades`) correctly
  returns `401` with no session; `/api/health` correctly reports
  `503`/`degraded` with each dependency listed `unavailable` when
  credentials are placeholders; the public `/verify/[id]` page correctly
  handles a malformed ID, and a well-formed but nonexistent ID, without
  errors.
- Not yet tested (requires real credentials — see "Manual setup" below):
  an actual end-to-end submission through a real Supabase project, R2
  bucket, and deployed Sepolia contract; RLS policies exercised against
  two real user sessions; an actual duplicate-retry against a live chain.

## Email confirmation (dev vs. production)

Whether `signUp()` returns an active session immediately or requires the
user to click a confirmation link first is controlled entirely by the
Supabase **project's** own setting — not by anything in this codebase:

**Supabase Dashboard → Authentication → Providers → Email → "Confirm
email"**

- **Development/demo**: turn this **off**. `supabase.auth.signUp()` then
  returns a session directly; `app/register/page.tsx` detects that
  (`data.session` is present) and redirects straight to the student
  dashboard — no email step at all.
- **Production**: turn this **on**. `signUp()` then returns no session;
  the same registration page detects that and shows a "check your email"
  state instead, and the user logs in normally after confirming.

The app code doesn't need to know which mode it's in — it branches on
whatever `signUp()` actually returned, so flipping this one Supabase
setting is the entire configuration change between the two modes. There
is no application-level flag to misconfigure or accidentally leave in
the wrong state for production, because there isn't one — the toggle
lives where it should, in Supabase's own auth settings.

## Known V1 limitations

- **Deadlines are informational, not enforced.** The student dashboard
  shows a "past due" indicator once `assignment.deadline` has passed, but
  `POST /api/submissions` does not check the deadline and will accept a
  late submission. This is intentional for V1 — the original spec never
  listed deadline enforcement as a requirement — not an oversight. Adding
  a server-side deadline check (reject with 409 if `now() > deadline`) is
  a small, isolated change if you want it: it belongs in
  `app/api/submissions/route.ts`, right after the assignment lookup and
  before the `INSERT`.

- Student/teacher dashboard pages (`app/dashboard/student`,
  `app/dashboard/teacher`) and the assignment-creation UI are not yet
  wired up — the API routes and components (`SubmissionUploadForm`,
  `VerifyIntegrityCard`, `StatusBadge`) exist and are validated, but
  nothing calls them from a dashboard page yet.
- No `PATCH`/`DELETE` route for assignments yet (RLS policies for
  teacher update/delete already exist in the migration; the API surface
  to use them is still to be added).
- No automated test suite (unit/integration) — validation so far is
  typecheck + lint + build + manual HTTP smoke tests, not a CI test
  suite.
- Single server-held blockchain signer (see "Trust model" above).

## What's implemented vs. left as an exercise

Implemented and validated (typecheck + lint + build + smoke test, see
above): schema + RLS (including the role-escalation guard and the
removal of student direct-update access to `submissions`), RBAC helpers,
full upload state machine with idempotent retry, R2 presigned
upload/download, SHA-256 hashing, Solidity contract, verification flow
(app + public page), grading, granular audit logging, health check, core
UI components.

Left as an exercise (see "Known V1 limitations" above for the full list):
seed data for local demos, an automated test suite. (Dashboard pages,
assignment edit/delete, and the Hardhat deployment setup — previously
listed here as gaps — have since been implemented.)
