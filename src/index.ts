// Main entry point - launches all agent services and the dashboard
// Usage: ORCHESTRATOR_KEY=0x... TRANSLATOR_KEY=0x... SUMMARIZER_KEY=0x... SENTIMENT_KEY=0x... npm start

import express from "express";
import { createServer } from "http";
import { CONFIG, getAgentKeys } from "./config.js";
import { createTranslatorAgent, createSummarizerAgent, createSentimentAgent } from "./agents.js";
import { OrchestratorAgent } from "./orchestrator.js";
import { tracker } from "./tracker.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const keys = getAgentKeys();

  // 1. Start specialist agent servers
  console.log("=== Starting AgentSwarm ===\n");

  const translator = createTranslatorAgent(keys.translatorKey);
  const summarizer = createSummarizerAgent(keys.summarizerKey);
  const sentiment = createSentimentAgent(keys.sentimentKey);

  translator.app.listen(CONFIG.ports.translator, () => {
    console.log(`[Translator] Listening on :${CONFIG.ports.translator} | Address: ${translator.address}`);
  });

  summarizer.app.listen(CONFIG.ports.summarizer, () => {
    console.log(`[Summarizer] Listening on :${CONFIG.ports.summarizer} | Address: ${summarizer.address}`);
  });

  sentiment.app.listen(CONFIG.ports.sentiment, () => {
    console.log(`[Sentiment]  Listening on :${CONFIG.ports.sentiment} | Address: ${sentiment.address}`);
  });

  // 2. Create orchestrator
  const orchestrator = new OrchestratorAgent(keys.orchestratorKey);
  console.log(`[Orchestrator] Address: ${orchestrator.address}`);

  // 3. Dashboard + API server
  const dashApp = express();
  dashApp.use(express.json());
  dashApp.use(express.static(join(__dirname, "..", "public")));

  // API: Get all transactions
  dashApp.get("/api/transactions", (_req, res) => {
    res.json(tracker.getAll());
  });

  // API: Get stats
  dashApp.get("/api/stats", (_req, res) => {
    res.json(tracker.getStats());
  });

  // API: Get agent info
  dashApp.get("/api/agents", async (_req, res) => {
    try {
      const balances = await orchestrator.getBalances();
      res.json({
        orchestrator: {
          address: orchestrator.address,
          gatewayBalance: balances.gateway.formattedAvailable,
          walletBalance: balances.wallet.formatted,
        },
        agents: {
          translator: { address: translator.address, price: CONFIG.pricing.translator, port: CONFIG.ports.translator },
          summarizer: { address: summarizer.address, price: CONFIG.pricing.summarizer, port: CONFIG.ports.summarizer },
          sentiment: { address: sentiment.address, price: CONFIG.pricing.sentiment, port: CONFIG.ports.sentiment },
        },
      });
    } catch (err: any) {
      res.json({
        orchestrator: { address: orchestrator.address, error: err.message },
        agents: {
          translator: { address: translator.address, price: CONFIG.pricing.translator },
          summarizer: { address: summarizer.address, price: CONFIG.pricing.summarizer },
          sentiment: { address: sentiment.address, price: CONFIG.pricing.sentiment },
        },
      });
    }
  });

  // API: Deposit USDC into Gateway
  dashApp.post("/api/deposit", async (req, res) => {
    try {
      const amount = req.body?.amount || "5";
      const result = await orchestrator.ensureDeposit(amount);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Run single pipeline
  dashApp.post("/api/pipeline", async (req, res) => {
    try {
      const { text, targetLang = "es" } = req.body;
      if (!text) {
        res.status(400).json({ error: "Missing 'text' field" });
        return;
      }
      const result = await orchestrator.fullPipeline(text, targetLang);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Batch process (generates 50+ transactions)
  dashApp.post("/api/batch", async (req, res) => {
    try {
      const { texts, targetLang = "es" } = req.body;
      if (!texts || !Array.isArray(texts)) {
        res.status(400).json({ error: "Missing 'texts' array" });
        return;
      }
      const results = await orchestrator.batchProcess(texts, targetLang);
      const stats = tracker.getStats();
      res.json({ results, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE endpoint for real-time transaction updates
  dashApp.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const onTx = (tx: any) => {
      res.write(`data: ${JSON.stringify(tx)}\n\n`);
    };

    tracker.on("transaction", onTx);
    tracker.on("transaction:update", onTx);

    req.on("close", () => {
      tracker.off("transaction", onTx);
      tracker.off("transaction:update", onTx);
    });
  });

  dashApp.listen(CONFIG.ports.orchestrator, () => {
    console.log(`\n[Dashboard]  http://localhost:${CONFIG.ports.orchestrator}`);
    console.log("\n=== All agents ready! ===\n");
  });
}

main().catch(console.error);
