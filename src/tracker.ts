// Shared event bus for tracking all agent transactions
// Used by the dashboard for real-time visualization

import { EventEmitter } from "events";

export interface TransactionEvent {
  id: string;
  timestamp: number;
  from: string; // agent name
  to: string; // agent name
  amount: string; // e.g. "$0.002"
  service: string; // e.g. "translate"
  status: "pending" | "completed" | "failed";
  input: string; // truncated input
  output?: string; // truncated output
  txId?: string; // Gateway transaction ID
  latencyMs?: number;
}

class TransactionTracker extends EventEmitter {
  private transactions: TransactionEvent[] = [];
  private counter = 0;

  record(event: Omit<TransactionEvent, "id" | "timestamp">): string {
    const id = `tx-${++this.counter}`;
    const tx: TransactionEvent = {
      ...event,
      id,
      timestamp: Date.now(),
    };
    this.transactions.push(tx);
    this.emit("transaction", tx);
    return id;
  }

  update(id: string, patch: Partial<TransactionEvent>) {
    const tx = this.transactions.find((t) => t.id === id);
    if (tx) {
      Object.assign(tx, patch);
      this.emit("transaction:update", tx);
    }
  }

  getAll(): TransactionEvent[] {
    return [...this.transactions];
  }

  getStats() {
    const completed = this.transactions.filter((t) => t.status === "completed");
    const totalSpent = completed.length; // count of transactions
    const avgLatency =
      completed.reduce((sum, t) => sum + (t.latencyMs || 0), 0) /
      (completed.length || 1);

    const byAgent: Record<string, number> = {};
    for (const tx of completed) {
      byAgent[tx.to] = (byAgent[tx.to] || 0) + 1;
    }

    return {
      totalTransactions: this.transactions.length,
      completedTransactions: completed.length,
      failedTransactions: this.transactions.filter((t) => t.status === "failed").length,
      avgLatencyMs: Math.round(avgLatency),
      transactionsByAgent: byAgent,
    };
  }
}

export const tracker = new TransactionTracker();
