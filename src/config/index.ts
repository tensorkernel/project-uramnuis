import dotenv from 'dotenv';
import { Cluster } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Validates the presence of required environment variables
 * @param variables List of required environment variables
 * @throws Error if any required variable is missing
 */
function validateEnvironmentVariables(variables: string[]): void {
  const missing = variables.filter(variable => !process.env[variable]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Check for required environment variables
const requiredVariables = [
  'SOLANA_RPC_URL',
  'NETWORK',
  'WALLET_PRIVATE_KEY',
  'POOL_ID',
  'SOL_MINT',
  'USDC_MINT',
  'DISCORD_WEBHOOK_URL'
];

try {
  validateEnvironmentVariables(requiredVariables);
} catch (error) {
  logger.error('Configuration error:', error);
  process.exit(1);
}

// Export configuration object
export const config = {
  // Solana Configuration
  rpcUrl: process.env.SOLANA_RPC_URL as string,
  network: process.env.NETWORK as Cluster,
  
  // Wallet Configuration
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY as string,
  
  // Raydium Configuration
  poolId: process.env.POOL_ID as string,
  solMint: new PublicKey(process.env.SOL_MINT as string),
  usdcMint: new PublicKey(process.env.USDC_MINT as string),
  
  // Liquidity Bot Configuration
  priceRangePercent: Number(process.env.PRICE_RANGE_PERCENT || '5'),
  minSolBalance: Number(process.env.MIN_SOL_BALANCE || '0.05'),
  checkIntervalMinutes: Number(process.env.CHECK_INTERVAL_MINUTES || '5'),
  maxRetryAttempts: Number(process.env.MAX_RETRY_ATTEMPTS || '3'),
  
  // Discord Webhook for Notifications
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL as string,
  
  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Validate numerical values
if (config.priceRangePercent <= 0) {
  logger.error('PRICE_RANGE_PERCENT must be greater than 0');
  process.exit(1);
}

if (config.minSolBalance < 0.01) {
  logger.error('MIN_SOL_BALANCE must be at least 0.01 SOL for transaction fees');
  process.exit(1);
}

if (config.checkIntervalMinutes < 1) {
  logger.error('CHECK_INTERVAL_MINUTES must be at least 1 minute');
  process.exit(1);
}

export default config;