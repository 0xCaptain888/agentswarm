// Specialist Agent Services
// Each agent exposes an x402-protected API endpoint

import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { privateKeyToAccount } from "viem/accounts";
import { CONFIG } from "./config.js";
import { tracker } from "./tracker.js";

// ============================================================
// Simple AI simulation functions (no external API keys needed)
// In production, these would call real AI models
// ============================================================

function simulateTranslation(text: string, targetLang: string): string {
  // Simulated translation - demonstrates the payment flow
  const translations: Record<string, (t: string) => string> = {
    es: (t) => `[ES] ${t.split(" ").map((w) => w + "o").join(" ")}`,
    fr: (t) => `[FR] ${t.split(" ").map((w) => "le " + w).join(" ")}`,
    zh: (t) => `[ZH] 翻译: ${t.substring(0, 50)}...`,
    ja: (t) => `[JA] 翻訳: ${t.substring(0, 50)}...`,
    de: (t) => `[DE] ${t.split(" ").map((w) => w + "en").join(" ")}`,
  };
  const fn = translations[targetLang] || translations["es"]!;
  return fn(text);
}

function simulateSummarization(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= 10) return text;
  // Take first and last portions to simulate summarization
  const summary = [...words.slice(0, 5), "...", ...words.slice(-3)].join(" ");
  return `Summary: ${summary} (${words.length} words condensed to key points)`;
}

function simulateSentiment(text: string): {
  sentiment: string;
  score: number;
  confidence: number;
} {
  const positiveWords = ["good", "great", "excellent", "love", "amazing", "happy", "best", "wonderful"];
  const negativeWords = ["bad", "terrible", "awful", "hate", "worst", "sad", "poor", "horrible"];

  const lower = text.toLowerCase();
  let score = 0;
  for (const w of positiveWords) if (lower.includes(w)) score += 0.2;
  for (const w of negativeWords) if (lower.includes(w)) score -= 0.2;

  score = Math.max(-1, Math.min(1, score));
  const sentiment = score > 0.1 ? "positive" : score < -0.1 ? "negative" : "neutral";

  return {
    sentiment,
    score: Math.round(score * 100) / 100,
    confidence: 0.75 + Math.random() * 0.2,
  };
}

// ============================================================
// Create Agent Server
// ============================================================

export function createTranslatorAgent(walletKey: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  app.get("/health", (_req, res) => {
    res.json({ agent: "translator", status: "ok", address: account.address });
  });

  app.post("/translate", gateway.require(CONFIG.pricing.translator), (req, res) => {
    const { text, targetLang = "es" } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();
    const result = simulateTranslation(text, targetLang);
    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "translator",
      amount: CONFIG.pricing.translator,
      service: "translate",
      status: "completed",
      input: text.substring(0, 100),
      output: result.substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "translator",
      result,
      targetLang,
      paidBy: payment?.payer,
      price: CONFIG.pricing.translator,
    });
  });

  return { app, address: account.address };
}

export function createSummarizerAgent(walletKey: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  app.get("/health", (_req, res) => {
    res.json({ agent: "summarizer", status: "ok", address: account.address });
  });

  app.post("/summarize", gateway.require(CONFIG.pricing.summarizer), (req, res) => {
    const { text } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();
    const result = simulateSummarization(text);
    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "summarizer",
      amount: CONFIG.pricing.summarizer,
      service: "summarize",
      status: "completed",
      input: text.substring(0, 100),
      output: result.substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "summarizer",
      result,
      paidBy: payment?.payer,
      price: CONFIG.pricing.summarizer,
    });
  });

  return { app, address: account.address };
}

export function createSentimentAgent(walletKey: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  app.get("/health", (_req, res) => {
    res.json({ agent: "sentiment", status: "ok", address: account.address });
  });

  app.post("/analyze", gateway.require(CONFIG.pricing.sentiment), (req, res) => {
    const { text } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();
    const result = simulateSentiment(text);
    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "sentiment",
      amount: CONFIG.pricing.sentiment,
      service: "sentiment-analysis",
      status: "completed",
      input: text.substring(0, 100),
      output: JSON.stringify(result).substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "sentiment",
      result,
      paidBy: payment?.payer,
      price: CONFIG.pricing.sentiment,
    });
  });

  return { app, address: account.address };
}
