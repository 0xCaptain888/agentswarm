// AIsa x402 API Client
// Calls real x402-protected APIs at https://api.aisa.one/apis/v2/
// Uses GatewayClient.pay() to handle 402 payment negotiation automatically

import { GatewayClient } from "@circle-fin/x402-batching/client";

const AISA_BASE = "https://api.aisa.one/apis/v2";

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  description?: string;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  verified?: boolean;
  [key: string]: any;
}

export interface ScholarSearchResult {
  title: string;
  authors?: string[];
  abstract?: string;
  url?: string;
  [key: string]: any;
}

export class AisaClient {
  private client: GatewayClient;

  constructor(client: GatewayClient) {
    this.client = client;
  }

  /**
   * Fetch Twitter user info via AIsa x402 API
   * Cost: $0.000440 per call
   */
  async fetchTwitterUser(userName: string): Promise<{ data: TwitterUserInfo | null; cost: string; error?: string }> {
    const url = `${AISA_BASE}/twitter/user/info?userName=${encodeURIComponent(userName)}`;
    console.log(`[AIsa] Fetching Twitter user info for @${userName}...`);

    try {
      const { data, formattedAmount } = await this.client.pay<any>(url);
      console.log(`[AIsa] Twitter user fetched. Paid ${formattedAmount} USDC.`);
      return { data: data as TwitterUserInfo, cost: "$0.000440" };
    } catch (error: any) {
      console.error(`[AIsa] Twitter API error: ${error.message}`);
      return { data: null, cost: "$0.000000", error: error.message };
    }
  }

  /**
   * Fetch Google Scholar search results via AIsa x402 API
   * Cost varies per call
   */
  async fetchScholarSearch(query: string): Promise<{ data: ScholarSearchResult[] | null; cost: string; error?: string }> {
    const url = `${AISA_BASE}/google/scholar/search?query=${encodeURIComponent(query)}`;
    console.log(`[AIsa] Searching Google Scholar for "${query}"...`);

    try {
      const { data, formattedAmount } = await this.client.pay<any>(url);
      console.log(`[AIsa] Scholar search done. Paid ${formattedAmount} USDC.`);
      return { data: data as ScholarSearchResult[], cost: formattedAmount || "$0.001" };
    } catch (error: any) {
      console.error(`[AIsa] Scholar API error: ${error.message}`);
      return { data: null, cost: "$0.000000", error: error.message };
    }
  }
}
