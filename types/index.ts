// Core domain types, mirroring the Postgres schema in
// supabase/migrations/0001_init.sql. Keep these in sync with the DB.

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type SubmissionStatus =
  | 'UPLOADING'
  | 'STORED'
  | 'HASHED'
  | 'RECORDING'
  | 'CONFIRMED'
  | 'UPLOAD_FAILED'
  | 'HASH_FAILED'
  | 'BLOCKCHAIN_FAILED';

export const RETRYABLE_STATUSES: SubmissionStatus[] = ['BLOCKCHAIN_FAILED', 'RECORDING'];

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  student_number: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  deadline: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_hash: string | null;
  status: SubmissionStatus;
  blockchain_tx_hash: string | null;
  blockchain_block_number: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  submission_id: string;
  teacher_id: string;
  marks: number;
  feedback: string | null;
  graded_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VerificationResult {
  submissionId: string;
  verified: boolean;
  currentHash: string;
  onChainHash: string;
  transactionHash: string | null;
  blockNumber: number | null;
  explorerUrl: string | null;
  checkedAt: string;
}

// Allowed upload MIME types, enforced server-side in
// app/api/submissions/route.ts — never trust a client-supplied type alone.
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/zip',
  'application/x-zip-compressed'
] as const;
