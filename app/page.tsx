import Link from 'next/link';
import { PublicHeader } from '@/components/PublicHeader';
import { 
  ShieldCheck, 
  Lock, 
  Cpu, 
  Hash, 
  FileCheck, 
  Users, 
  ArrowRight, 
  Upload, 
  Database, 
  CheckCircle2 
} from 'lucide-react';

const FLOW_STEPS = [
  { step: '01', title: 'Upload', desc: 'Secure Presigned R2 Upload', icon: Upload },
  { step: '02', title: 'Store', desc: 'Encrypted Cloud Storage', icon: Database },
  { step: '03', title: 'Hash', desc: 'SHA-256 Fingerprint', icon: Hash },
  { step: '04', title: 'Record', desc: 'Sepolia On-Chain Proof', icon: Cpu },
  { step: '05', title: 'Verify', desc: 'Tamper-Proof Verification', icon: ShieldCheck }
];

const SECTIONS = [
  {
    icon: Lock,
    title: 'Secure Isolated Storage',
    desc: 'Files are written directly to Cloudflare R2 and accessed strictly via short-lived, authorization-gated presigned URLs.'
  },
  {
    icon: Hash,
    title: 'Cryptographic Fingerprinting',
    desc: 'Deterministic SHA-256 hashes are computed server-side from exact payload bytes for unambiguous fingerprint matching.'
  },
  {
    icon: Cpu,
    title: 'Blockchain Proof Recording',
    desc: 'Fingerprints are permanently anchored to smart contracts on Sepolia, guaranteeing an immutable write-once record.'
  },
  {
    icon: ShieldCheck,
    title: 'Live Tamper Detection',
    desc: 'Verification re-executes byte hash generation live and validates against the blockchain ledger on demand.'
  },
  {
    icon: FileCheck,
    title: 'Immutable Audit Trail',
    desc: 'Every critical event — upload, hashing, on-chain recording, verification, and grading — is timestamped and logged.'
  },
  {
    icon: Users,
    title: 'Role-Based Enforced Access',
    desc: 'Granular access controls guarantee students view only their work while teachers manage assigned cohorts securely.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero Section */}
        <div className="surface-grid relative mt-8 overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-16 text-center shadow-card sm:px-12 sm:py-24">
          <div className="absolute left-1/2 top-0 h-64 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-200/40 via-brand-100/20 to-transparent blur-3xl" />
          
          <div className="relative inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-sm mb-6">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <span>Cryptographic Academic Integrity Platform</span>
          </div>

          <h1 className="relative text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl">
            Academic submissions,
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
              verified by cryptography.
            </span>
          </h1>

          <p className="relative mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg">
            Every submission is fingerprinted, anchored to smart contracts on-chain, and independently verifiable —
            guaranteeing academic honesty through mathematical proof rather than implicit trust.
          </p>

          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-primary px-7 py-3 text-sm shadow-lift active:scale-95 transition-all">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
            <Link href="/login" className="btn-secondary px-7 py-3 text-sm active:scale-95 transition-all">
              <span>Sign In to Workspace</span>
            </Link>
          </div>

          {/* Quick Stats Banner */}
          <div className="relative mt-12 grid grid-cols-2 gap-4 border-t border-ink-100 pt-8 sm:grid-cols-4 max-w-3xl mx-auto">
            <div>
              <p className="text-2xl font-bold text-ink-900">100%</p>
              <p className="text-xs text-ink-500 font-medium">On-Chain Immutable</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">SHA-256</p>
              <p className="text-xs text-ink-500 font-medium">Byte Fingerprinting</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">Sepolia</p>
              <p className="text-xs text-ink-500 font-medium">Smart Contract Proof</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900">Zero</p>
              <p className="text-xs text-ink-500 font-medium">Public File Exposure</p>
            </div>
          </div>
        </div>

        {/* Verification Pipeline */}
        <div className="mt-20">
          <div className="text-center">
            <p className="eyebrow">Cryptographic Proof Pipeline</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              From File Upload to Immutable Proof
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-5">
            {FLOW_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="card p-5 relative flex flex-col justify-between hover:shadow-card hover:-translate-y-0.5 transition-all border-brand-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{s.step}</span>
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-ink-900">{s.title}</h3>
                    <p className="mt-1 text-xs text-ink-500 leading-normal">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <p className="eyebrow">Production Grade Infrastructure</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Designed for Universities & Academics
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="card-padded group hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift transition-all bg-white">
                  <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 w-fit group-hover:bg-brand-600 group-hover:text-white transition-colors shadow-sm">
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink-900 tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-600 to-indigo-700 p-8 sm:p-12 text-white shadow-lift">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to secure your institution&apos;s submissions?</h2>
          <p className="mt-3 text-brand-100 text-sm sm:text-base max-w-xl mx-auto">
            Experience real cryptographic verification with seamless student and instructor workflows.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register" className="btn-primary bg-white text-brand-700 hover:bg-brand-50 px-6 py-3 text-sm shadow-md">
              Create Student Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
