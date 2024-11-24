import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

if (!process.env.SOLSCAN_API_KEY || !process.env.TOKEN_ADDRESS) {
  throw new Error('SOLSCAN_API_KEY and TOKEN_ADDRESS environment variables are required');
}

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;

async function grassToSol(grassAmount) {
  try {
    const { data } = await axios.get('https://api.jup.ag/price/v2', {
      params: {
        ids: TOKEN_ADDRESS,
        vsToken: 'So11111111111111111111111111111111111111112'
      }
    });
    return grassAmount * parseFloat(data.data[TOKEN_ADDRESS].price);
  } catch (error) {
    console.error('Error fetching price from Jupiter:', error);
    throw error;
  }
}

class TokenMetricsService {
  static instance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://pro-api.solscan.io/v2.0',
      headers: {
        'Accept': 'application/json',
        'token': process.env.SOLSCAN_API_KEY
      }
    });
  }

  static getInstance() {
    if (!TokenMetricsService.instance) {
      TokenMetricsService.instance = new TokenMetricsService();
    }
    return TokenMetricsService.instance;
  }

  async fetchAndStoreTransactions() {
    try {
      const { data } = await this.api.get('/token/transfer', {
        params: { address: TOKEN_ADDRESS }
      });

      if (data.success && Array.isArray(data.data)) {
        const transactions = data.data.map(tx => ({
          hash: tx.trans_id,
          timestamp: new Date(tx.block_time * 1000),
          amount: tx.amount / Math.pow(10, tx.token_decimals),
          createdAt: new Date()
        }));

        if (transactions.length > 0) {
          await prisma.transaction.createMany({
            data: transactions,
            skipDuplicates: true
          });
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getMetrics() {
    try {
      await this.fetchAndStoreTransactions();

      const [metadata, stats, priceResponse] = await Promise.all([
        this.api.get('/token/meta', { params: { address: TOKEN_ADDRESS } }),
        prisma.transaction.aggregate({
          _count: { hash: true },
          _sum: { amount: true }
        }),
        this.api.get('/token/price', { params: { address: TOKEN_ADDRESS } })
      ]);

      return {
        holders: metadata.data.data.holder,
        totalTransactions: stats._count.hash,
        totalVolume: stats._sum.amount || 0,
        tokenPrice: priceResponse.data.success && priceResponse.data.data.length > 0 
          ? priceResponse.data.data[0].price 
          : null
      };
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getTransactions(limit = 15) {
    return prisma.transaction.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    });
  }
}

export const tokenMetricsService = TokenMetricsService.getInstance();
export { grassToSol };