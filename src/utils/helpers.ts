import { PublicKey } from '@solana/web3.js';
import { config } from '../config/index.js';
import { CONSTANTS } from '../constants/index.js';
import { createContextLogger } from './logger.js';

// Create service-specific logger
const logger = createContextLogger('Helpers');

/**
 * Formats a SOL amount for display
 * @param lamports Amount in lamports
 * @returns Formatted SOL amount with symbol
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  return `${sol.toFixed(4)} SOL`;
}

/**
 * Formats a USDC amount for display
 * @param amount Amount in USDC base units
 * @returns Formatted USDC amount with symbol
 */
export function formatUsdc(amount: number): string {
  const usdc = amount / 1e6;
  return `$${usdc.toFixed(2)}`;
}

/**
 * Formats a price for display
 * @param price Price value
 * @param decimals Number of decimals to display
 * @returns Formatted price with $ symbol
 */
export function formatPrice(price: number, decimals = 4): string {
  return `$${price.toFixed(decimals)}`;
}

/**
 * Creates an explorer URL for a transaction
 * @param signature Transaction signature
 * @returns Explorer URL
 */
export function getExplorerUrl(signature: string): string {
  const baseUrl = config.network === 'mainnet-beta'
    ? 'https://explorer.solana.com'
    : `https://explorer.solana.com?cluster=${config.network}`;
  
  return `${baseUrl}/tx/${signature}`;
}

/**
 * Creates an explorer URL for an address
 * @param address Public key or address string
 * @returns Explorer URL
 */
export function getAddressExplorerUrl(address: PublicKey | string): string {
  const addressStr = typeof address === 'string' ? address : address.toString();
  
  const baseUrl = config.network === 'mainnet-beta'
    ? 'https://explorer.solana.com'
    : `https://explorer.solana.com?cluster=${config.network}`;
  
  return `${baseUrl}/address/${addressStr}`;
}

/**
 * Calculates optimal token amounts for a price range
 * @param lowerPrice Lower bound price
 * @param upperPrice Upper bound price
 * @param currentPrice Current price
 * @param totalValueUsdc Total value in USDC
 * @returns Optimal SOL and USDC amounts
 */
export function calculateOptimalAmounts(
  lowerPrice: number,
  upperPrice: number,
  currentPrice: number,
  totalValueUsdc: number
): { solAmount: number; usdcAmount: number } {
  // Calculate square roots for concentrated liquidity formula
  const sqrtPrice = Math.sqrt(currentPrice);
  const sqrtLowerPrice = Math.sqrt(lowerPrice);
  const sqrtUpperPrice = Math.sqrt(upperPrice);
  
  let solAmount = 0;
  let usdcAmount = 0;
  
  if (currentPrice <= lowerPrice) {
    // All USDC, no SOL
    usdcAmount = totalValueUsdc;
  } else if (currentPrice >= upperPrice) {
    // All SOL, no USDC
    solAmount = totalValueUsdc / currentPrice;
  } else {
    // Calculate the position within the range (0 to 1)
    const positionInRange = (sqrtPrice - sqrtLowerPrice) / (sqrtUpperPrice - sqrtLowerPrice);
    
    // Allocate funds based on position in range
    solAmount = (totalValueUsdc / currentPrice) * (1 - positionInRange);
    usdcAmount = totalValueUsdc * positionInRange;
  }
  
  // Apply minimum thresholds
  if (solAmount < CONSTANTS.POSITION.MIN_SOL_AMOUNT) {
    solAmount = 0;
    usdcAmount = totalValueUsdc;
  }
  
  if (usdcAmount < CONSTANTS.POSITION.MIN_USDC_AMOUNT) {
    usdcAmount = 0;
    solAmount = totalValueUsdc / currentPrice;
  }
  
  logger.debug('Calculated optimal amounts', {
    lowerPrice,
    upperPrice,
    currentPrice,
    totalValueUsdc,
    solAmount,
    usdcAmount
  });
  
  return { solAmount, usdcAmount };
}

/**
 * Sleeps for the specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 * @param fn Function to retry
 * @param retries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = config.maxRetryAttempts,
  baseDelay = 1000
): Promise<T> {
  let attempts = 0;
  let lastError: Error | null = null;
  
  while (attempts < retries) {
    try {
      return await fn();
    } catch (error) {
      attempts++;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempts >= retries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempts);
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempts}/${retries})`, {
        error: lastError.message
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Truncates a public key for display
 * @param publicKey Public key to truncate
 * @param startChars Characters to keep at the start
 * @param endChars Characters to keep at the end
 * @returns Truncated public key
 */
export function truncatePublicKey(
  publicKey: PublicKey | string,
  startChars = 4,
  endChars = 4
): string {
  const pkStr = typeof publicKey === 'string' ? publicKey : publicKey.toString();
  if (pkStr.length <= startChars + endChars) {
    return pkStr;
  }
  return `${pkStr.slice(0, startChars)}...${pkStr.slice(-endChars)}`;
}