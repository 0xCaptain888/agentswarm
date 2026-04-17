// AgentSwarm Configuration
// All agent wallets and network settings

export const CONFIG = {
  // Arc Testnet
  chain: "arcTestnet" as const,
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",

  // USDC on Arc Testnet
  usdcAddress: "0x3600000000000000000000000000000000000000" as `0x${string}`,
  gatewayContract: "0x0077777d7eba4688bdef3e311b846f25870a19b9" as `0x${string}`,

  // Server ports for each agent service
  ports: {
    translator: 4001,
    summarizer: 4002,
    sentiment: 4003,
    orchestrator: 3000, // Main entry point + dashboard
  },

  // Per-call pricing in USD (all sub-cent to demonstrate nanopayments)
  pricing: {
    translator: "$0.002",
    summarizer: "$0.003",
    sentiment: "$0.001",
  },
} as const;

// Agent wallet private keys - loaded from environment
// In production, use proper secrets management
export function getAgentKeys() {
  const orchestratorKey = process.env.ORCHESTRATOR_KEY as `0x${string}`;
  const translatorKey = process.env.TRANSLATOR_KEY as `0x${string}`;
  const summarizerKey = process.env.SUMMARIZER_KEY as `0x${string}`;
  const sentimentKey = process.env.SENTIMENT_KEY as `0x${string}`;

  if (!orchestratorKey || !translatorKey || !summarizerKey || !sentimentKey) {
    console.error("Missing agent private keys in environment variables.");
    console.error("Required: ORCHESTRATOR_KEY, TRANSLATOR_KEY, SUMMARIZER_KEY, SENTIMENT_KEY");
    process.exit(1);
  }

  return { orchestratorKey, translatorKey, summarizerKey, sentimentKey };
}
