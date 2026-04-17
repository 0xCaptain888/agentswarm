// Wallet Setup Script
// Generates 4 agent wallets and outputs the private keys
// Run: npx tsx src/setup-wallets.ts

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

console.log("=== AgentSwarm Wallet Generator ===\n");
console.log("Generating 4 agent wallets for Arc Testnet...\n");

const agents = ["ORCHESTRATOR", "TRANSLATOR", "SUMMARIZER", "SENTIMENT"];
const envLines: string[] = [];

for (const name of agents) {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  console.log(`${name}:`);
  console.log(`  Address: ${account.address}`);
  console.log(`  Key:     ${key}\n`);
  envLines.push(`${name}_KEY=${key}`);
}

console.log("=== .env file content (copy to .env) ===\n");
console.log(envLines.join("\n"));

console.log("\n\n=== Next Steps ===");
console.log("1. Copy the .env content above into a file named .env");
console.log("2. Go to https://faucet.circle.com/");
console.log("3. Select 'Arc Testnet' and fund EACH address with testnet USDC");
console.log("4. The Orchestrator needs the most USDC (it pays for all services)");
console.log("5. Run: npm start");
console.log("6. Open http://localhost:3000 for the dashboard");
console.log("7. In another terminal, run: npm run demo");
