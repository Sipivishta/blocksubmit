// Deploy script for SubmissionRegistry using Hardhat + ethers v6.
//
// Local/no-credentials validation (compiles + deploys to Hardhat's
// built-in in-memory network, proves this script is mechanically correct):
//   npx hardhat run scripts/deploy.ts
//
// Real Sepolia deployment (requires BLOCKCHAIN_RPC_URL and a
// BLOCKCHAIN_PRIVATE_KEY funded with Sepolia test ETH in .env):
//   npm run deploy:sepolia
//   (equivalent to: npx hardhat run scripts/deploy.ts --network sepolia)
//
// Never logs BLOCKCHAIN_PRIVATE_KEY or any other secret — only the
// deployer's public address (safe to print; it's not sensitive) and the
// resulting contract address.
import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name} (chainId ${network.config.chainId ?? 'unknown'})`);
  console.log('Deploying SubmissionRegistry with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer balance:', ethers.formatEther(balance), 'ETH');
  if (balance === 0n && network.name !== 'hardhat') {
    console.warn(
      'Warning: deployer balance is 0 — this deployment will fail unless the account is funded with test ETH.'
    );
  }

  const Factory = await ethers.getContractFactory('SubmissionRegistry');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log('\nSubmissionRegistry deployed to:', address);
  if (deployTx) {
    console.log('Deployment transaction hash:', deployTx.hash);
  }
  console.log(`\nSet this in your .env: BLOCKCHAIN_CONTRACT_ADDRESS=${address}`);
  if (network.name === 'sepolia') {
    console.log(`View on Etherscan: https://sepolia.etherscan.io/address/${address}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
