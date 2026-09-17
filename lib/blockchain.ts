// Blockchain client: wraps ethers v6 calls to SubmissionRegistry.
// A single server-held signer submits all transactions (see contract
// README note on trust model). UUIDs are encoded to bytes32 via keccak256
// of the UUID string, kept consistent between recording and verification.
import { ethers } from 'ethers';
import { hexToBytes32 } from './hash';

const CONTRACT_ABI = [
  'function recordSubmission(bytes32 submissionId, bytes32 studentId, bytes32 assignmentId, bytes32 fileHash) external',
  'function getSubmission(bytes32 submissionId) external view returns (bytes32 studentId, bytes32 assignmentId, bytes32 fileHash, uint256 timestamp, address recordedBy)',
  'function hasRecord(bytes32 submissionId) external view returns (bool)',
  'event SubmissionRecorded(bytes32 indexed submissionId, bytes32 indexed studentId, bytes32 indexed assignmentId, bytes32 fileHash, uint256 timestamp)'
];

// Both getProvider() and getSigner() are called lazily, inside individual
// functions only — never at module scope. Importing this module (e.g.
// transitively, via a page that imports lib/blockchain.ts for
// explorerTxUrl) never itself opens an RPC connection; a connection is
// only attempted when a function that actually needs the chain runs
// (recordSubmissionOnChain, getOnChainRecord, checkBlockchainHealth).
//
// The provider is given an explicit Sepolia network (chain ID 11155111)
// with staticNetwork set, so ethers skips its own eth_chainId
// auto-detection call entirely instead of attempting it and retrying in a
// background loop when the RPC URL is unreachable or a placeholder (e.g.
// during a build with no real credentials — this is what previously
// produced repeated "failed to detect network... retry in 1s" log lines).
// This does not hide a bad RPC URL: the first real chain call
// (getBlockNumber, a contract read, or sending a transaction) against an
// unreachable URL still throws normally and is still surfaced by
// checkBlockchainHealth / the calling route's error handling. It only
// removes ethers' own redundant network-detection retries, which were
// log noise, not a real signal.
const SEPOLIA_CHAIN_ID = 11155111;

function getProvider() {
  const chainId = Number(process.env.BLOCKCHAIN_CHAIN_ID ?? SEPOLIA_CHAIN_ID);
  return new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL!, ethers.Network.from(chainId), {
    staticNetwork: true
  });
}

function getSigner() {
  return new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY!, getProvider());
}

// ethers v6 types a Contract built from a plain human-readable ABI array
// (no TypeChain-generated bindings) as having possibly-undefined method
// properties, since it can't statically know the ABI's shape. This is a
// genuine third-party typing limitation, not a real runtime risk — the ABI
// above guarantees these methods exist. contract.getFunction(name) returns
// a properly-typed, always-defined callable, so we use that instead of
// property access to avoid non-null assertions scattered through the file.
function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contract = new ethers.Contract(
    process.env.BLOCKCHAIN_CONTRACT_ADDRESS!,
    CONTRACT_ABI,
    signerOrProvider
  );
  return {
    hasRecord: contract.getFunction('hasRecord') as (submissionId: string) => Promise<boolean>,
    recordSubmission: contract.getFunction('recordSubmission') as (
      submissionId: string,
      studentId: string,
      assignmentId: string,
      fileHash: string
    ) => Promise<ethers.ContractTransactionResponse>,
    getSubmission: contract.getFunction('getSubmission') as (
      submissionId: string
    ) => Promise<[string, string, string, bigint, string]>,
    // contract.filters is subject to the same dynamic-ABI typing gap
    // described above; the ABI guarantees this event exists.
    queryRecordedEvents: (submissionId: string) =>
      contract.queryFilter(contract.filters.SubmissionRecorded!(submissionId))
  };
}

/** Deterministically encode a Postgres UUID string as a bytes32 identifier. */
export function uuidToBytes32(uuid: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(uuid));
}

export interface RecordResult {
  txHash: string;
  blockNumber: number;
}

/**
 * Record a submission's fingerprint on-chain.
 *
 * Idempotency: this is the piece that protects against the exact crash
 * window called out in the spec — tx confirms on-chain, then the process
 * dies before the DB row is updated to CONFIRMED. On any retry (from either
 * BLOCKCHAIN_FAILED or a stuck RECORDING row), we first check the
 * contract's own hasRecord(submissionId). The contract enforces write-once
 * per submissionId, so if a record already exists it is guaranteed to be
 * the one from the earlier attempt — never a partial or conflicting write.
 * In that case we recover the original tx hash + block number from the
 * SubmissionRecorded event log (via queryFilter) instead of erroring or
 * submitting a second, contract-reverting transaction. This makes the
 * function safe to call repeatedly with the same submissionId.
 */
export async function recordSubmissionOnChain(params: {
  submissionId: string;
  studentId: string;
  assignmentId: string;
  fileHashHex: string;
}): Promise<RecordResult> {
  const signer = getSigner();
  const contract = getContract(signer);
  const submissionIdB32 = uuidToBytes32(params.submissionId);

  const alreadyRecorded = await contract.hasRecord(submissionIdB32);
  if (alreadyRecorded) {
    const events = await contract.queryRecordedEvents(submissionIdB32);
    const event = events[0];
    if (!event || !('transactionHash' in event)) {
      throw new Error(
        'BLOCKCHAIN_STATE_INCONSISTENT: contract reports a record exists but no event log was found'
      );
    }
    return { txHash: event.transactionHash, blockNumber: event.blockNumber };
  }

  const tx = await contract.recordSubmission(
    submissionIdB32,
    uuidToBytes32(params.studentId),
    uuidToBytes32(params.assignmentId),
    hexToBytes32(params.fileHashHex)
  );

  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error('BLOCKCHAIN_TX_FAILED: transaction reverted or receipt missing');
  }

  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

/** Read back the on-chain fingerprint for verification. */
export async function getOnChainRecord(submissionId: string) {
  const provider = getProvider();
  const contract = getContract(provider);
  const submissionIdB32 = uuidToBytes32(submissionId);

  const exists = await contract.hasRecord(submissionIdB32);
  if (!exists) return null;

  const [, , fileHash, timestamp] = await contract.getSubmission(submissionIdB32);
  return {
    fileHashHex: fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash, // match sha256Hex format
    timestamp: Number(timestamp)
  };
}

export function explorerTxUrl(txHash: string): string {
  const base = process.env.BLOCKCHAIN_EXPLORER_BASE_URL ?? 'https://sepolia.etherscan.io';
  return `${base}/tx/${txHash}`;
}

/** Basic connectivity check used by /api/health. */
export async function checkBlockchainHealth(): Promise<boolean> {
  try {
    const provider = getProvider();
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
}
