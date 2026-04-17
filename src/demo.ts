// Demo script - generates 50+ on-chain transactions
// Run after starting the main server with: npm run demo
//
// This script sends 20 texts through the full 3-agent pipeline
// = 60 total agent-to-agent payment transactions (20 x 3 agents)

const SAMPLE_TEXTS = [
  "Bitcoin just hit a new all-time high of $150,000 as institutional adoption accelerates globally.",
  "The Federal Reserve announced a surprise rate cut, sending markets into a rally across all sectors.",
  "Ethereum's latest upgrade reduced gas fees by 90%, making DeFi accessible to millions of new users.",
  "Circle's USDC stablecoin now processes over $10 trillion in annual transaction volume on Arc.",
  "AI agents are revolutionizing financial markets by executing trades with sub-millisecond precision.",
  "The terrible crash in the bond market has left investors worried about a potential recession.",
  "Apple announced amazing quarterly earnings, beating analyst expectations by a wide margin.",
  "Climate change legislation faces strong opposition in Congress, creating uncertainty for green energy stocks.",
  "The new cryptocurrency regulations provide excellent clarity for institutional investors worldwide.",
  "Supply chain disruptions continue to cause problems for manufacturing companies across Asia.",
  "Machine learning models are now capable of predicting market movements with unprecedented accuracy.",
  "The housing market shows signs of recovery after a prolonged period of declining prices.",
  "Central banks worldwide are exploring digital currencies as the future of monetary policy.",
  "The worst drought in decades threatens agricultural output and food security in major economies.",
  "Nanopayments technology enables micropayments as small as one millionth of a dollar per transaction.",
  "The gig economy continues to grow rapidly, creating wonderful opportunities for freelance workers.",
  "Cybersecurity threats are becoming more sophisticated, requiring advanced AI-powered defense systems.",
  "The electric vehicle market experienced tremendous growth with sales doubling year over year.",
  "International trade tensions escalated with new tariffs imposed on technology imports.",
  "Decentralized finance protocols now manage over $500 billion in total value locked across networks.",
];

const TARGET_LANGS = ["es", "fr", "zh", "ja", "de"];

async function runDemo() {
  console.log("=== AgentSwarm Demo: Generating 60+ Agent-to-Agent Transactions ===\n");
  console.log(`Sending ${SAMPLE_TEXTS.length} texts through the full pipeline`);
  console.log(`Each pipeline: Sentiment ($0.001) -> Summary ($0.003) -> Translation ($0.002)`);
  console.log(`Total expected transactions: ${SAMPLE_TEXTS.length * 3}`);
  console.log(`Total expected cost: $${(SAMPLE_TEXTS.length * 0.006).toFixed(3)}\n`);

  const baseUrl = "http://localhost:3000";

  // First, check if the server is running
  try {
    const health = await fetch(`${baseUrl}/api/stats`);
    if (!health.ok) throw new Error("Server not responding");
  } catch {
    console.error("Error: AgentSwarm server is not running!");
    console.error("Start it first with: npm start");
    process.exit(1);
  }

  // Run batch pipeline
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SAMPLE_TEXTS.length; i++) {
    const text = SAMPLE_TEXTS[i]!;
    const lang = TARGET_LANGS[i % TARGET_LANGS.length]!;

    console.log(`\n[${i + 1}/${SAMPLE_TEXTS.length}] Processing: "${text.substring(0, 60)}..."`);

    try {
      const resp = await fetch(`${baseUrl}/api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: lang }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const result = await resp.json();
      results.push(result);
      successCount++;
      console.log(`  ✓ Sentiment: ${result.sentiment.sentiment} (${result.sentiment.score})`);
      console.log(`  ✓ Summary: ${result.summary.substring(0, 60)}...`);
      console.log(`  ✓ Translation [${lang}]: ${result.translation.substring(0, 60)}...`);
      console.log(`  Cost: ${result.totalCost}`);
    } catch (err: any) {
      failCount++;
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  // Print final stats
  console.log("\n\n=== Demo Complete ===");
  console.log(`Successful pipelines: ${successCount}/${SAMPLE_TEXTS.length}`);
  console.log(`Failed pipelines: ${failCount}/${SAMPLE_TEXTS.length}`);
  console.log(`Total agent-to-agent transactions: ${successCount * 3}`);
  console.log(`Total USDC spent: $${(successCount * 0.006).toFixed(4)}`);

  // Get final stats from server
  try {
    const statsResp = await fetch(`${baseUrl}/api/stats`);
    const stats = await statsResp.json();
    console.log("\nServer-side stats:", JSON.stringify(stats, null, 2));
  } catch {}

  console.log("\n--- Margin Analysis ---");
  console.log("Traditional gas cost per tx (Ethereum L1): ~$0.50 - $5.00");
  console.log("Traditional gas cost per tx (L2 rollup):    ~$0.01 - $0.10");
  console.log("Nanopayment cost per tx (Arc + Gateway):    ~$0.00 (gas-free, batched)");
  console.log(`Our per-action prices: $0.001 - $0.003`);
  console.log("At these prices, traditional gas would EXCEED the payment itself.");
  console.log("Only Nanopayments on Arc make sub-cent agent commerce viable.");
}

runDemo().catch(console.error);
