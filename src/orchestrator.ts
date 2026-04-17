// Orchestrator Agent
// The "brain" that coordinates specialist agents, paying each one per-call
// Demonstrates autonomous agent-to-agent payment loops

import { GatewayClient } from "@circle-fin/x402-batching/client";
import { CONFIG } from "./config.js";
import { tracker } from "./tracker.js";

export class OrchestratorAgent {
  private client: GatewayClient;
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
