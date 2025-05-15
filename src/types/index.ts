import { PublicKey } from '@solana/web3.js';

/**
 * Type definitions for the application
 */

/**
 * Position information
 */
export interface Position {
  id: string;
  owner: PublicKey;
  poolId: PublicKey;
  lowerTick: number;
  upperTick: number;
  lowerPrice: number;
  upperPrice: number;
  liquidity: bigint;
  tokenAmounts: {
    base: number; // SOL amount
    quote: number; // USDC amount
  };
  inRange: boolean;
  createdAt: Date;
}

/**
 * Pool information
 */
export interface PoolInfo {
  id: PublicKey;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  currentPrice: number;
  liquidity: bigint;
  fee: number;
  tickSpacing: number;
}

/**
 * Token information
 */
export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  decimals: number;
  balance?: number;
}

/**
 * Price range
 */
export interface PriceRange {
  lowerBound: number;
  upperBound: number;
}

/**
 * Transaction result
 */
export interface TransactionResult {
  signature: string;
  success: boolean;
}

/**
 * Bot configuration
 */
export interface BotConfig {
  rpcUrl: string;
  network: string;
  walletPrivateKey: string;
  poolId: string;
  priceRangePercent: number;
  minSolBalance: number;
  checkIntervalMinutes: number;
  maxRetryAttempts: number;
  discordWebhookUrl: string;
  logLevel: string;
}

/**
 * Notification types
 */
export enum NotificationType {
  STARTUP = 'startup',
  POSITION_CREATED = 'position_created',
  POSITION_WITHDRAWN = 'position_withdrawn',
  BALANCE_UPDATE = 'balance_update',
  TRANSACTION = 'transaction',
  PRICE_UPDATE = 'price_update',
  ERROR = 'error',
  SHUTDOWN = 'shutdown'
}

/**
 * Transaction types
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  REBALANCE = 'rebalance'
}