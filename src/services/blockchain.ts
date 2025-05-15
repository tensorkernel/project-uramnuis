import { Connection, Commitment, ConfirmOptions, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import bs58 from 'bs58';

// Create a context-specific logger
const log = logger.child({ service: 'blockchain' });

let connection: Connection;

/**
 * Initializes the Solana connection
 * @returns Solana connection object
 */
export async function initializeConnection(): Promise<Connection> {
  if (connection) return connection;

  const commitment: Commitment = 'confirmed';
  
  // Create connection with custom confirmation strategy
  connection = new Connection(config.rpcUrl, {
    commitment,
    confirmTransactionInitialTimeout: 60000, // 60s timeout for transaction confirmation
    disableRetryOnRateLimit: false
  });

  // Test connection by getting the latest blockhash
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    log.info(`Successfully connected to Solana ${config.network}. Latest blockhash: ${blockhash}`);
    return connection;
  } catch (error) {
    log.error('Failed to connect to Solana:', error);
    throw new Error(`Failed to connect to Solana network: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a Keypair from a private key
 * @param privateKey Base58 encoded private key
 * @returns Solana Keypair
 */
export function createKeypairFromPrivateKey(privateKey: string): Keypair {
  try {
    const decodedKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decodedKey);
  } catch (error) {
    log.error('Failed to create keypair from private key:', error);
    throw new Error('Invalid private key format. Please ensure it is a valid base58 encoded key.');
  }
}

/**
 * Default confirmation options for transactions
 */
export const defaultConfirmOptions: ConfirmOptions = {
  commitment: 'confirmed',
  preflightCommitment: 'processed',
  skipPreflight: false,
  maxRetries: 3
};

/**
 * Sends and confirms a transaction with intelligent retries
 * @param transaction The transaction to send
 * @param signers Array of signers for the transaction
 * @param retries Number of retry attempts
 * @returns Transaction signature
 */
export async function sendTransactionWithRetry(
  transaction: Transaction,
  signers: Array<Keypair>,
  retries = 3
): Promise<string> {
  if (!connection) {
    throw new Error('Solana connection not initialized');
  }

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < retries) {
    try {
      // Update blockhash on each attempt to avoid expired blockhash errors
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        defaultConfirmOptions
      );

      log.info(`Transaction confirmed: ${signature}`);
      return signature;
    } catch (error) {
      attempts++;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If we have retries left, wait and try again
      if (attempts < retries) {
        const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
        log.warn(`Transaction failed, retrying in ${delay}ms (attempt ${attempts}/${retries})`, { error: lastError.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries have failed
  throw new Error(`Transaction failed after ${retries} attempts: ${lastError?.message}`);
}

export { connection };