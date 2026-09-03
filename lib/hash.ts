// SHA-256 hashing, always computed server-side from bytes actually written
// to (or read back from) R2 — never trust a client-supplied hash.
import { createHash } from 'crypto';

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Convert a hex-encoded SHA-256 digest to the bytes32 the contract expects. */
export function hexToBytes32(hex: string): `0x${string}` {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error('Expected a 32-byte (64 hex char) SHA-256 digest');
  }
  return `0x${clean}`;
}
