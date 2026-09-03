import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';

const FLOW_STEPS = ['Upload', 'Store', 'Hash', 'Record', 'Verify'];

const SECTIONS = [
  {
    title: 'Secure storage',
    desc: 'Files are written to Cloudflare R2 and only ever accessed through short-lived, authorization-gated presigned URLs — never a permanent public link.'
  },
  {
    title: 'Cryptographic fingerprinting',
    desc: 'A SHA-256 hash is computed server-side from the exact bytes stored — the same bytes are always what gets fingerprinted and later re-checked.'
  },
  {
    title: 'Blockchain proof',
    desc: 'The fingerprint is recorded on-chain in a write-once smart contract — no submission\u2019s recorded fingerprint can ever be silently altered.'
  },
  {
    title: 'Tamper detection',
    desc: 'Verification recomputes the hash from the file as it exists right now and compares it against the immutable on-chain record, live, every time.'
  },
  {
    title: 'Immutable audit trail',
    desc: 'Every step \u2014 upload, hash, blockchain record, verification, grading \u2014 is logged and visible on the submission\u2019s own timeline.'
  },
  {
    title: 'Role-based access',
    desc: 'Students see only their own work. Teachers see only their own assignments. Every boundary is enforced server-side, not just hidden in the UI.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="surface-grid relative mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white px-5 py-16 text-center shadow-card sm:px-10 sm:py-24">
          <div className="absolute left-1/2 top-0 h-48 w-2/3 -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />
          <p className="eyebrow relative">Academic integrity infrastructure</p>
          <h1 className="relative mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-ink-900 sm:text-6xl">
            Academic submissions,
            <br />
            <span className="text-brand-600">verified by cryptography.</span>
          </h1>
          <p className="relative mx-auto mt-6 max-w-xl text-base leading-7 text-ink-500 sm:text-lg">
            Every file is hashed, anchored to a blockchain, and independently verifiable —
            so the integrity of submitted work is never just a matter of trust.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary px-6 py-2.5 text-sm">
              Get Started
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-2.5 text-sm">
              Sign In
            </Link>
          </div>
        </div>

        {/* Verification flow */}
        <div className="mt-16">
          <p className="eyebrow text-center">The proof pipeline</p>
          <div className="pipeline-rail mt-5 grid gap-5 rounded-2xl border border-brand-100 bg-white/80 p-3 shadow-card sm:grid-cols-5 sm:gap-2 sm:p-4">
            {FLOW_STEPS.map((step, i) => (
              <div key={step} className="pipeline-step relative flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-3 shadow-sm sm:min-w-0 sm:px-3 sm:py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">0{i + 1}</span>
                <span className="text-sm font-semibold text-ink-800">{step}</span>
                {i < FLOW_STEPS.length - 1 && <span aria-hidden="true" className="pipeline-arrow absolute -bottom-5 left-1/2 -translate-x-1/2 rotate-90 text-brand-400 sm:bottom-auto sm:left-auto sm:right-[-11px] sm:top-1/2 sm:translate-x-0 sm:-translate-y-1/2 sm:rotate-0">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Feature sections */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="card-padded group hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
              <div className="h-1 w-8 rounded-full bg-brand-500 transition-all group-hover:w-12" />
              <p className="mt-4 text-sm font-semibold text-ink-900">{s.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/register" className="btn-primary px-6 py-2.5 text-sm">
            Create your account
          </Link>
        </div>
      </main>
    </div>
  );
}
