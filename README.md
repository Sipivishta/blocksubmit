# BlockSubmit

### Secure Academic Document Submission & Integrity Verification Platform

BlockSubmit is a full-stack academic document submission platform designed to provide **secure file storage, cryptographic integrity verification, blockchain-backed proof, role-based access control, auditability, and submission similarity analysis**.

The platform separates the actual document from its verification proof:

- Documents are stored privately in **Cloudflare R2**
- Application data and access control are managed through **Supabase PostgreSQL + Auth + RLS**
- A server-side **SHA-256 fingerprint** is generated for every accepted submission
- The fingerprint and submission metadata are recorded on **Ethereum Sepolia**
- Temporary signed URLs provide controlled document viewing/downloading
- Similarity analysis identifies potentially matching submissions
- Teachers can grade submissions
- Administrators control teacher-student relationships
- Audit timelines provide a traceable submission history

> **Important:** Blockchain records the document fingerprint and metadata, not the document itself.

---

## Features

### 🔐 Role-Based Access Control

BlockSubmit supports three application roles:

- **Student**
- **Teacher**
- **Admin**

Authorization is enforced server-side and reinforced through Supabase Row Level Security (RLS).

### Student

Students can:

- View assignments available to them
- Upload submissions
- View submission status
- View submitted documents
- Download submitted documents
- Verify document integrity
- View SHA-256 fingerprints
- View blockchain proof
- View grades
- View submission audit history
- View similarity information where permitted

### Teacher

Teachers can:

- Create and manage assignments
- View submissions for their assignments
- Grade submissions from `0–100`
- View submission history
- Verify document integrity
- View blockchain proof
- View similarity analysis
- Review potential similarity matches
- Manage their academic workflow through the teacher dashboard

### Admin

Administrators can:

- Manage teachers
- Manage students
- Promote eligible users to teachers
- Create teacher accounts
- Explicitly link teachers and students
- Remove teacher-student relationships
- View administrative information
- Access role-protected administrative functionality

Teacher-student access is relationship-based rather than globally granting every teacher access to every student.

---

# Core Architecture

```text
                         ┌──────────────────────┐
                         │      BlockSubmit     │
                         │       Next.js        │
                         │     App Router       │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      ┌─────────────┐       ┌──────────────┐      ┌──────────────┐
      │  Supabase   │       │ Cloudflare   │      │   Ethereum   │
      │ PostgreSQL  │       │     R2       │      │    Sepolia   │
      │ Auth + RLS  │       │ Private Files│      │ Solidity     │
      └─────────────┘       └──────────────┘      └──────────────┘
             │                      │                      │
             │                      │                      │
       Users, roles,          Academic files        SHA-256 proof
       assignments,           temporary signed      + metadata
       submissions,           access URLs
       grades, audit
       relationships
```

Data responsibilities
Supabase

Stores:

Users and profiles
Roles
Assignments
Submissions
Grades
Teacher-student relationships
Audit logs
Similarity match records
Submission metadata

Supabase RLS provides an additional database-level authorization layer.

Cloudflare R2

Stores:

Original submitted documents

Files remain in a private bucket.

Access is provided through short-lived signed URLs after server-side authorization checks.

Ethereum Sepolia

Stores:

Submission identifier
SHA-256 document fingerprint
Relevant submission metadata

The actual document is never uploaded to the blockchain.

Submission Pipeline

Every submission follows a controlled processing pipeline:

01 Upload
     ↓
02 Store
     ↓
03 Hash
     ↓
04 Record
     ↓
05 Verify

Internally, the submission state machine is:

UPLOADING
    ↓
STORED
    ↓
HASHED
    ↓
RECORDING
    ↓
CONFIRMED

Failure states are handled separately:

UPLOAD_FAILED
HASH_FAILED
BLOCKCHAIN_FAILED

A blockchain failure does not invalidate the uploaded document or its generated hash. The blockchain recording step can be retried.

Document Upload Security

BlockSubmit does not blindly trust the MIME type supplied by the browser.

The server validates uploaded file content before accepting it.

Supported document formats include:

PDF
DOCX
PPTX

Validation includes content-level checks such as:

PDF
PDF signature/header validation
supported PDF structure
EOF validation
DOCX / PPTX
ZIP/container validation
required Office XML structures
malformed archive detection
encrypted/malformed archive rejection

The detected content type is used rather than trusting the browser-provided MIME type.

Files that fail validation do not proceed to accepted storage/submission processing.

Private Document Access

Submitted files are stored in a private Cloudflare R2 bucket.

BlockSubmit does not expose permanent public file URLs.

Instead, authorized requests receive short-lived signed URLs.

The submission interface provides separate actions for:

View
Download

For supported PDF files, viewing can open the document inline.

DOCX/PPTX files may require download depending on browser support.

Cryptographic Integrity Verification

Every accepted document receives a server-generated SHA-256 fingerprint.

Example:

SHA-256

f6a430597f64e2fc9a357f200954a766e2765ee71d5416ac8ef7f4203e06a717

The hash is generated from the actual server-received file bytes.

The browser does not provide the authoritative hash.

This allows BlockSubmit to later recompute the document hash and compare it against the recorded fingerprint.

Blockchain Verification

BlockSubmit uses a Solidity smart contract deployed on Ethereum Sepolia.

The blockchain record contains the document fingerprint and metadata rather than the document itself.

Example verification information:

Integrity Proof

SHA-256
f6a430...a717

Network
Ethereum Sepolia

Status
Confirmed

Block
11723252

Transaction
0xe585...1d73

The blockchain acts as a tamper-evident external record of the submission fingerprint.

Blockchain Retry & Recovery

BlockSubmit handles failures between the application and blockchain.

A submission may reach:

RECORDING

or:

BLOCKCHAIN_FAILED

without requiring the user to upload the document again.

The recording process uses an idempotent strategy:

The smart contract prevents duplicate records for the same submission.
The application checks whether a blockchain record already exists.
Existing transaction information can be recovered.
Failed blockchain recording can be retried.

This prevents a retry from creating an unintended second on-chain record.

Teacher–Student Relationships

Teacher access is explicitly controlled by administrators.

The relationship model is many-to-many:

Teacher A ──┬── Student 1
            ├── Student 2
            └── Student 3

Teacher B ──┬── Student 2
            ├── Student 4
            └── Student 5

A teacher does not automatically gain access to every student.

Administrators can:

Create relationships
View relationships
Remove relationships

Historical submission records are preserved when a relationship is removed.

Re-establishing the relationship restores the appropriate current access.

Similarity Analysis

BlockSubmit includes a separate similarity-analysis layer.

This is intentionally different from cryptographic integrity verification.

Integrity asks:

Has this exact document changed?

Similarity asks:

Does this submission contain content similar to another submission?

Similarity analysis can identify:

Similarity percentage
Potential matching submissions
Potential source submissions
Evidence snippets
Similarity status

Example:

SIMILARITY ANALYSIS

High Similarity
87%

Potential Match
Another submission for the same assignment

Evidence
────────────────────────────────
matching content / evidence
────────────────────────────────

Teacher Review Required

Similarity analysis is a signal for review, not an automatic determination of plagiarism.

The system does not automatically declare a student guilty of plagiarism based solely on a similarity score.

Similarity results are protected through role-based access.

Similarity Processing

The similarity system uses:

text extraction
document normalization
text shingling
Jaccard-based similarity comparison
persisted similarity match records

Supported extraction currently includes:

PDF
DOCX

PPTX text extraction is not currently treated as a supported similarity-analysis format.

Similarity processing is designed to run separately from the critical submission integrity pipeline so that a similarity-analysis failure does not invalidate the document submission itself.

Audit Timeline

Important submission events are recorded in an audit timeline.

A typical submission may show:

● Submission created
│
● File stored
│
● SHA-256 generated
│
● Blockchain recording
│
● Blockchain confirmed
│
● Grade created

Audit entries provide a chronological view of important actions and system events.

Audit writes are protected from arbitrary browser-side insertion.

Grading

Teachers can grade authorized submissions using a 0–100 mark range.

Example:

Grade

99 / 100

Grade ownership and teacher authorization are enforced server-side and through database policies.

Grade creation/update events are also represented in the audit timeline.

Security Architecture

BlockSubmit uses multiple layers of security.

Authentication

Supabase Auth handles user authentication.

Authorization

Server-side role checks re-derive the user's role from the database.

Roles:

STUDENT
TEACHER
ADMIN

Frontend role-based navigation is only a convenience layer and is not treated as an authorization boundary.

Row Level Security

Supabase RLS provides database-level authorization in addition to server-side checks.

CSRF / Origin Protection

Authenticated state-changing API requests validate their request origin.

Trusted origins are explicitly configured rather than blindly trusting arbitrary request headers.

Private Storage

R2 objects remain private and are accessed using temporary signed URLs.

File Validation

Uploaded files are validated using server-side content inspection.

Server-Side Secrets

Sensitive credentials such as:

Supabase service-role credentials
Cloudflare R2 secret keys
Blockchain private keys

are server-side only.

They are never intended for browser/client code.

Smart Contract

The Solidity contract is located at:

contracts/SubmissionRegistry.sol

The contract provides write-once submission records.

The application records:

submissionId
fileHash
metadata

The contract prevents recording a second blockchain entry for the same submission identifier.

The application uses the contract's existing record to support safe retry/recovery behavior.

Technology Stack
Frontend
Next.js 15.5.25
React
TypeScript
Tailwind CSS
Backend
Next.js App Router API routes
Supabase
PostgreSQL
Supabase Auth
Row Level Security
Storage
Cloudflare R2
S3-compatible object storage
Presigned URLs
Cryptography
SHA-256
Blockchain
Solidity
Ethereum Sepolia
Hardhat
Document Processing
PDF validation/extraction
DOCX validation/extraction
PPTX validation
Text similarity analysis
Project Structure
```text
blocksubmit/
│
├── app/
│   ├── admin/
│   │   ├── relationships/
│   │   ├── students/
│   │   └── teachers/
│   │
│   ├── api/
│   │   ├── admin/
│   │   ├── assignments/
│   │   ├── grades/
│   │   └── submissions/
│   │       ├── [id]/
│   │       │   ├── download/
│   │       │   ├── retry/
│   │       │   ├── similarity/
│   │       │   ├── timeline/
│   │       │   └── verify/
│   │       └── route.ts
│   │
│   ├── assignments/
│   ├── login/
│   ├── register/
│   ├── student/
│   ├── teacher/
│   ├── submissions/
│   ├── verify/
│   ├── globals.css
│   ├── icon.png
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── AppShell.tsx
│   ├── AuditTimeline.tsx
│   ├── DownloadButton.tsx
│   ├── GradeDisplay.tsx
│   ├── GradeForm.tsx
│   ├── RelationshipManager.tsx
│   ├── SimilarityCard.tsx
│   ├── StateMachineStepper.tsx
│   ├── StatusBadge.tsx
│   ├── SubmissionUploadForm.tsx
│   └── VerifyIntegrityCard.tsx
│
├── contracts/
│   └── SubmissionRegistry.sol
│
├── lib/
│   ├── audit.ts
│   ├── auth.ts
│   ├── blockchain.ts
│   ├── file-validation.ts
│   ├── hash.ts
│   ├── r2.ts
│   ├── request-origin.ts
│   ├── similarity-pipeline.ts
│   ├── similarity.ts
│   ├── supabase-browser.ts
│   ├── supabase-server.ts
│   └── text-extraction.ts
│
├── scripts/
│   └── deploy.ts
│
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql
│       ├── 0002_fix_handle_new_user.sql
│       ├── 0003_tighten_write_policies.sql
│       ├── 0004_grade_marks_0_to_100.sql
│       ├── 0005_signup_roles_and_teacher_invites.sql
│       ├── 0006_teacher_student_links.sql
│       └── 0007_similarity_matches.sql
│
├── types/
│   └── index.ts
│
├── hardhat.config.ts
├── middleware.ts
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```
Environment Variables

Create a local .env.local file.

Never commit .env.local to GitHub.

Required configuration:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PRESIGNED_URL_TTL_SECONDS=300

BLOCKCHAIN_RPC_URL=
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_PRIVATE_KEY=
BLOCKCHAIN_CONTRACT_ADDRESS=

APP_ORIGIN=
Security

Do not expose:

SUPABASE_SERVICE_ROLE_KEY
R2_SECRET_ACCESS_KEY
BLOCKCHAIN_PRIVATE_KEY

to client-side code.

Do not commit them to Git.

Supabase Setup

Run all migrations in order:

0001_init.sql
0002_fix_handle_new_user.sql
0003_tighten_write_policies.sql
0004_grade_marks_0_to_100.sql
0005_signup_roles_and_teacher_invites.sql
0006_teacher_student_links.sql
0007_similarity_matches.sql

These migrations establish the application schema, authorization policies, role protections, teacher-student relationships, grading constraints, and similarity-match storage.

Authentication

New users register through the standard registration flow.

Normal registration creates:

STUDENT

Users do not select ADMIN or TEACHER from the registration interface.

Teacher and administrator privileges are controlled through server-side/admin workflows.

For local development, Supabase email confirmation can be disabled:

Supabase Dashboard
→ Authentication
→ Providers
→ Email
→ Confirm email
→ OFF

For production deployments, email confirmation should be configured according to the deployment's authentication requirements.

Blockchain Deployment

Install dependencies:

npm install

Compile the smart contract:

npm run compile

Deploy to Sepolia:

npm run deploy:sepolia

The deployment script uses:

BLOCKCHAIN_RPC_URL=
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_PRIVATE_KEY=

After deployment, configure:

BLOCKCHAIN_CONTRACT_ADDRESS=

with the deployed contract address.

Never commit the blockchain private key.

Running Locally

Install dependencies:

npm install

Start the development server:

npm run dev

Open:

http://localhost:3000

For production validation:

npm run typecheck
npm run lint
npm run build
End-to-End Workflow

A typical workflow is:
```text

Admin
  │
  ├── Creates/promotes teacher
  │
  └── Links teacher ↔ student
            │
            ▼
Teacher
  │
  └── Creates assignment
            │
            ▼
Student
  │
  └── Uploads document
            │
            ▼
Server Validation
            │
            ▼
Private R2 Storage
            │
            ▼
SHA-256
            │
            ▼
Ethereum Sepolia
            │
            ▼
Confirmed Submission
            │
            ├── Integrity Verification
            │
            ├── Similarity Analysis
            │
            ├── Teacher Grading
            │
            └── Audit Timeline
```
Verification Flow

For a confirmed submission:

Retrieve the authorized document from private R2.
Recompute its SHA-256 fingerprint.
Retrieve the blockchain record.
Compare the recomputed hash with the recorded hash.
Return the integrity result.

Possible outcomes include:
```text

VERIFIED
```

or:
```text

TAMPERED
```

A TAMPERED result means the current document bytes no longer match the fingerprint recorded on-chain.

Testing & Validation

The current build has been validated with:
```text

npm run typecheck
npm run lint
npm run build
```

Manual functional testing has covered:

Student registration/login
Teacher access
Admin access
Teacher-student relationships
Assignment creation
Student submission
File validation
Private R2 storage
Submission state progression
SHA-256 generation
Ethereum Sepolia recording
Blockchain retry/recovery
View document
Download document
Integrity verification
Teacher grading
Audit timeline
Similarity detection
Similarity evidence
Role-based similarity visibility
Student privacy
Duplicate submission prevention
Teacher ownership/access restrictions
Known Limitations
Similarity analysis

Similarity analysis is intended as a review signal.

A similarity score does not independently establish plagiarism.

Teacher review is required before making an academic determination.

Document extraction

PDF and DOCX text extraction are supported for similarity analysis.

PPTX similarity extraction is currently not supported.

Blockchain signer

The current architecture uses a server-side signer for blockchain writes.

A production system requiring protection against a compromised application server could move toward a role-gated multi-signer or user-controlled signing architecture.

Automated tests

The project has validation through typechecking, linting, production builds, deterministic similarity tests, security checks, and manual end-to-end testing.

A larger automated integration/E2E suite remains a future improvement.

Deadline enforcement

Assignment deadlines are currently represented in the application but are not intended to be a hard server-side submission cutoff in the current version.

Future Improvements

Potential future work includes:

Automated integration/E2E test suite
Background job processing for similarity analysis
Expanded document text extraction
Malware scanning pipeline
Advanced similarity algorithms
Better similarity explanations
Production-grade rate limiting
Security headers/CSP hardening
Background blockchain job processing
Multi-signer blockchain authorization
Advanced analytics dashboards
Notification system
Email-based teacher invitations
Production monitoring and observability
Security Philosophy

BlockSubmit follows a defense-in-depth approach.
```text

Authentication
      +
Server-side Authorization
      +
Supabase RLS
      +
Private R2 Storage
      +
Temporary Signed URLs
      +
Server-side File Validation
      +
SHA-256 Integrity
      +
Blockchain Proof
      +
Audit Logging
      +
Origin Validation
```

No single layer is intended to provide the entire security boundary.

Project Status

Current status: Functional development build

The core BlockSubmit workflow is implemented and manually validated across the major student, teacher, and administrator workflows.

The project is intended as an academic/security engineering project demonstrating:

Full-stack development
Secure file handling
Role-based authorization
Database security
Cloud object storage
Cryptographic integrity
Blockchain integration
Fault-tolerant processing
Document analysis
Similarity detection
Auditability

License

This project is intended for educational and portfolio purposes.

