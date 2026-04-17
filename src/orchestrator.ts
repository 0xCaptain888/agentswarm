// Orchestrator Agent
// The "brain" that coordinates specialist agents, paying each one per-call
// Demonstrates autonomous agent-to-agent payment loops

import { GatewayClient } from "@circle-fin/x402-batching/client";
import { CONFIG } from "./config.js";
import { tracker } from "./tracker.js";
import { AisaClient } from "./aisa-client.js";

export class OrchestratorAgent {
  private client: GatewayClient;
  private aisaClient: AisaClient;
  private baseUrls: {
    translator: string;
    summarizer: string;
    sentiment: string;
  };

  constructor(privateKey: `0x${string}`) {
    this.client = new GatewayClient({
      chain: CONFIG.chain,
      privateKey,
    });

    this.aisaClient = new AisaClient(this.client);

    this.baseUrls = {
      translator: `http://localhost:${CONFIG.ports.translator}`,
      summarizer: `http://localhost:${CONFIG.ports.summarizer}`,
      sentiment: `http://localhost:${CONFIG.ports.sentiment}`,
    };
  }

  get address() {
    return this.client.address;
  }

  async getBalances() {
    return this.client.getBalances();
  }

  async ensureDeposit(amount = "5") {
    const balances = await this.client.getBalances();
    console.log(`[Orchestrator] Gateway balance: ${balances.gateway.formattedAvailable} USDC`);
    console.log(`[Orchestrator] Wallet balance: ${balances.wallet.formatted} USDC`);

    if (balances.gateway.available < 1_000_000n) {
      console.log(`[Orchestrator] Depositing ${amount} USDC into Gateway...`);
      const deposit = await this.client.deposit(amount);
      console.log(`[Orchestrator] Deposit tx: ${deposit.depositTxHash}`);
      return deposit;
    }
    return null;
  }

  // Call translator agent with payment
  async translate(text: string, targetLang = "es") {
    const url = `${this.baseUrls.translator}/translate`;
    console.log(`[Orchestrator] Paying translator for: "${text.substring(0, 50)}..."`);

    const { data, status, formattedAmount, transaction } = await this.client.pay<{
      agent: string;
      result: string;
      targetLang: string;
      paidBy: string;
      price: string;
    }>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });

    console.log(`[Orchestrator] Translation done. Paid ${formattedAmount} USDC. Status: ${status}`);
    return data;
  }

  // Call summarizer agent with payment
  async summarize(text: string) {
    const url = `${this.baseUrls.summarizer}/summarize`;
    console.log(`[Orchestrator] Paying summarizer for: "${text.substring(0, 50)}..."`);

    const { data, status, formattedAmount } = await this.client.pay<{
      agent: string;
      result: string;
      paidBy: string;
      price: string;
    }>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    console.log(`[Orchestrator] Summary done. Paid ${formattedAmount} USDC. Status: ${status}`);
    return data;
  }

  // Call sentiment agent with payment
  async analyzeSentiment(text: string) {
    const url = `${this.baseUrls.sentiment}/analyze`;
    console.log(`[Orchestrator] Paying sentiment analyzer for: "${text.substring(0, 50)}..."`);

    const { data, status, formattedAmount } = await this.client.pay<{
      agent: string;
      result: { sentiment: string; score: number; confidence: number };
      paidBy: string;
      price: string;
    }>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    console.log(`[Orchestrator] Sentiment done. Paid ${formattedAmount} USDC. Status: ${status}`);
    return data;
  }

  // Full pipeline: analyze + summarize + translate
  // Demonstrates chained agent-to-agent payments
  async fullPipeline(text: string, targetLang = "es") {
    console.log("\n=== Starting Full Agent Pipeline ===");
    console.log(`Input text: "${text.substring(0, 80)}..."`);

    // Step 1: Sentiment analysis ($0.001)
    const sentiment = await this.analyzeSentiment(text);

    // Step 2: Summarization ($0.003)
    const summary = await this.summarize(text);

    // Step 3: Translation of the summary ($0.002)
    const translation = await this.translate(summary.result, targetLang);

    // Total cost: $0.006 per full pipeline
    return {
      original: text,
      sentiment: sentiment.result,
      summary: summary.result,
      translation: translation.result,
      totalCost: "$0.006",
      steps: [
        { agent: "sentiment", cost: CONFIG.pricing.sentiment },
        { agent: "summarizer", cost: CONFIG.pricing.summarizer },
        { agent: "translator", cost: CONFIG.pricing.translator },
      ],
    };
  }

  // Research pipeline: fetch real data via AIsa, then analyze with agents
  // Demonstrates real x402 API calls + agent-to-agent payments
  async researchAndAnalyze(topic: string, targetLang = "es") {
    console.log("\n=== Starting Research & Analyze Pipeline ===");
    console.log(`Topic: "${topic}"`);

    // Step 1: Fetch real Twitter data via AIsa x402 API ($0.000440)
    // Use topic as a Twitter username hint, or default to "jack"
    const twitterUser = topic.replace(/[^a-zA-Z0-9_]/g, "").substring(0, 15) || "jack";
    const twitterResult = await this.aisaClient.fetchTwitterUser(twitterUser);

    let researchText: string;
    if (twitterResult.data) {
      researchText = `Twitter profile for @${twitterResult.data.username || twitterUser}: ` +
        `${twitterResult.data.name || "Unknown"} - ${twitterResult.data.description || "No description"}. ` +
        `Followers: ${twitterResult.data.followers_count ?? "N/A"}, ` +
        `Following: ${twitterResult.data.following_count ?? "N/A"}, ` +
        `Tweets: ${twitterResult.data.tweet_count ?? "N/A"}.`;

      tracker.record({
        from: "orchestrator",
        to: "aisa-twitter",
        amount: "$0.000440",
        service: "twitter-user-info",
        status: "completed",
        input: `@${twitterUser}`,
        output: researchText.substring(0, 100),
      });
    } else {
      // Fallback if AIsa API call fails
      researchText = `Research on topic "${topic}": This is a simulated research result as the live API was unavailable. ` +
        `The topic appears to be trending with significant public interest and mixed sentiment across social media platforms.`;

      tracker.record({
        from: "orchestrator",
        to: "aisa-twitter",
        amount: "$0.000000",
        service: "twitter-user-info",
        status: "failed",
        input: `@${twitterUser}`,
        output: twitterResult.error || "API unavailable",
      });
    }

    console.log(`[Research] Data gathered: "${researchText.substring(0, 80)}..."`);

    // Step 2: Sentiment analysis on the research data ($0.001)
    const sentiment = await this.analyzeSentiment(researchText);

    // Step 3: Summarize the research + sentiment ($0.003)
    const enrichedText = `${researchText} Sentiment analysis: ${sentiment.result.sentiment} ` +
      `(score: ${sentiment.result.score}, confidence: ${sentiment.result.confidence.toFixed(2)}).`;
    const summary = await this.summarize(enrichedText);

    // Step 4: Translate the summary ($0.002)
    const translation = await this.translate(summary.result, targetLang);

    // Total: $0.000440 (AIsa) + $0.001 + $0.003 + $0.002 = $0.006440
    return {
      topic,
      twitterData: twitterResult.data,
      researchText,
      sentiment: sentiment.result,
      summary: summary.result,
      translation: translation.result,
      totalCost: "$0.006440",
      steps: [
        { agent: "aisa-twitter", cost: twitterResult.cost, real: !twitterResult.error },
        { agent: "sentiment", cost: CONFIG.pricing.sentiment },
        { agent: "summarizer", cost: CONFIG.pricing.summarizer },
        { agent: "translator", cost: CONFIG.pricing.translator },
      ],
    };
  }

  // Batch processing: run multiple texts through the pipeline
  // Generates 50+ transactions for the hackathon requirement
  async batchProcess(texts: string[], targetLang = "es") {
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      console.log(`\n--- Processing text ${i + 1}/${texts.length} ---`);
      try {
        const result = await this.fullPipeline(texts[i]!, targetLang);
        results.push({ index: i, status: "success", result });
      } catch (error: any) {
        console.error(`[Orchestrator] Error on text ${i + 1}: ${error.message}`);
        results.push({ index: i, status: "error", error: error.message });
      }
    }
    return results;
  }
}
