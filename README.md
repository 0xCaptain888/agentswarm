# AgentSwarm — AI Agent-to-Agent Payment Marketplace on Arc

> **Hackathon Track**: Agent-to-Agent Payment Loop
> **Technologies**: Arc, USDC, Circle Nanopayments, Circle Gateway, x402

## What is AgentSwarm?

AgentSwarm is a marketplace where autonomous AI agents buy and sell services from each other using USDC nanopayments on Arc. Each agent exposes an x402-protected API endpoint, and the Orchestrator agent autonomously coordinates specialist agents, paying per-call in real-time.

### Architecture

```
┌─────────────────┐
│   User / API     │
└────────┬────────┘
         │
┌────────▼────────┐     x402 ($0.001)     ┌──────────────┐
│   Orchestrator   │ ──────────────────▶  │  Sentiment   │
│   (Brain Agent)  │                       │  Analyzer    │
│                  │     x402 ($0.003)     ├──────────────┤
│   Pays per-call  │ ──────────────────▶  │  Summarizer  │
│   via Gateway    │                       │              │
│                  │     x402 ($0.002)     ├──────────────┤
│                  │ ──────────────────▶  │  Translator  │
└──────────────────┘                       └──────────────┘
         │
    Circle Gateway (batched USDC settlement on Arc)
```

**Full Pipeline**: Text → Sentiment ($0.001) → Summary ($0.003) → Translation ($0.002) = **$0.006 total**

### Why This Matters

| Method | Cost/tx | Viable for $0.001? |
|--------|---------|-------------------|
| Ethereum L1 | $0.50–$5.00 | ✗ (500x–5000x the payment) |
| L2 Rollup | $0.01–$0.10 | ✗ (10x–100x the payment) |
| Stripe | $0.30 minimum | ✗ (300x the payment) |
| **Arc + Nanopayments** | **~$0.00** | **✓ (100% margin)** |

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Generate Wallets

```bash
npm run setup
```

This generates 4 agent wallets. Copy the output into a `.env` file.

### 3. Fund Wallets

Go to [faucet.circle.com](https://faucet.circle.com/), select **Arc Testnet**, and fund each address with testnet USDC. The Orchestrator needs the most (it pays for all services).

### 4. Start All Agents

```bash
npm start
```

This launches:
- Translator Agent on `:4001`
- Summarizer Agent on `:4002`
- Sentiment Agent on `:4003`
- Orchestrator + Dashboard on `:3000`

### 5. Open Dashboard

Visit [http://localhost:3000](http://localhost:3000) for the real-time command center.

### 6. Run Demo (60+ transactions)

```bash
npm run demo
```

Sends 20 texts through the full 3-agent pipeline = **60 agent-to-agent payment transactions**.

## Project Structure

```
agentswarm/
├── src/
│   ├── index.ts          # Main server, launches all agents + dashboard
│   ├── agents.ts         # Specialist agent services (Translator, Summarizer, Sentiment)
│   ├── orchestrator.ts   # Orchestrator agent with GatewayClient
│   ├── tracker.ts        # Transaction event bus for real-time tracking
│   ├── config.ts         # Network and pricing configuration
│   ├── demo.ts           # Batch demo script (generates 60+ txs)
│   └── setup-wallets.ts  # Wallet generation utility
├── public/
│   └── index.html        # Real-time dashboard
├── package.json
├── tsconfig.json
└── README.md
```

## Circle Products Used

| Product | Usage |
|---------|-------|
| **Arc** | Settlement layer — all transactions settle on Arc Testnet |
| **USDC** | Payment token — agents pay each other in USDC |
| **Nanopayments** | Core infrastructure — enables sub-cent, gas-free payments |
| **Circle Gateway** | Batched settlement — aggregates payments, settles in bulk |
| **x402 Protocol** | Payment standard — HTTP 402 + EIP-3009 signed authorizations |

## Key Technical Details

- **Chain**: Arc Testnet (Chain ID: 5042002)
- **SDK**: `@circle-fin/x402-batching` (buyer + seller APIs)
- **Payment Flow**: EIP-3009 off-chain signatures → Gateway batched settlement
- **Per-action pricing**: $0.001 – $0.003 (all sub-cent)
- **Transaction frequency**: 60+ on-chain transactions in demo

## License

MIT
