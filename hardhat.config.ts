// Minimal Hardhat setup for compiling and deploying SubmissionRegistry.sol.
// This file is dev-tooling only — it is never imported by the Next.js
// application and never bundled into the browser. It reads the same
// BLOCKCHAIN_* environment variables lib/blockchain.ts already uses, via
// dotenv, so there is exactly one source of truth for these values.
//
// ESM/CommonJS note: this project has one shared tsconfig.json, whose
// top-level "module": "esnext" is required by Next.js. Hardhat's own
// ts-node loader reads that same tsconfig — without an override, it would
// transpile scripts/deploy.ts's `import { ethers, network } from 'hardhat'`
// into real ESM `import` syntax, which Node then runs through its native
// ESM loader against the 'hardhat' package. That fails, because
// hardhat-toolbox attaches `ethers`/`network` to the Hardhat Runtime
// Environment dynamically at plugin-registration time, not as static
// `module.exports` properties — so Node's ESM loader can't see them via
// static analysis, and throws "Named export 'ethers' not found".
// tsconfig.json's `"ts-node": { "compilerOptions": { "module": "commonjs" } }`
// block fixes this: it's read only by ts-node (i.e. only by Hardhat), so
// `tsc --noEmit` and the Next.js build (which don't know about that key)
// are completely unaffected and still compile the app with "esnext" as
// before. Under CommonJS, `ethers`/`network` are read as plain property
// lookups on the required module at call-time — by which point the
// toolbox plugin has already populated them — so there's no static-export
// resolution problem at all.
import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL ?? '';
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY ?? '';
const CHAIN_ID = Number(process.env.BLOCKCHAIN_CHAIN_ID ?? 11155111);

// Only wire up the sepolia network if both an RPC URL and a private key
// are actually present — this lets `npx hardhat compile` (and any other
// command that doesn't need a live network) work with no .env at all,
// which matters for CI / sandboxed validation that has no real
// credentials. Deploying without these set fails with Hardhat's own clear
// "network sepolia not configured" error rather than a confusing one.
const sepoliaNetwork =
  RPC_URL && PRIVATE_KEY
    ? {
        sepolia: {
          url: RPC_URL,
          accounts: [PRIVATE_KEY],
          chainId: CHAIN_ID
        }
      }
    : {};

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    ...sepoliaNetwork
    // Hardhat's built-in in-memory "hardhat" network is always available
    // for `npx hardhat run scripts/deploy.ts` with no --network flag, and
    // requires no credentials — used for local deployment-script validation.
  },
  paths: {
    sources: './contracts',
    artifacts: './artifacts',
    cache: './cache'
  }
};

export default config;
