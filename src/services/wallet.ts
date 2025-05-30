import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createKeypairFromPrivateKey } from './blockchain.js';
import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';

// Create service-specific logger
const logger = createContextLogger('WalletManager');

/**
 * Manages wallet operations including token balances and transactions
 */
export class WalletManager {
  private connection: Connection;
  private keypair: Keypair;
  private walletAddress: PublicKey;

  constructor(connection: Connection) {
    this.connection = connection;
    this.keypair = createKeypairFromPrivateKey(config.walletPrivateKey);
    this.walletAddress = this.keypair.publicKey;
  }

  /**
   * Initializes the wallet manager
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing wallet manager for address: ${this.walletAddress.toString()}`);
    
    try {
      // Verify the wallet exists and has sufficient SOL
      const solBalance = await this.getSolBalance();
      logger.info(`Wallet SOL balance: ${solBalance} SOL`);
      
      if (solBalance < config.minSolBalance) {
        logger.warn(`Wallet SOL balance (${solBalance}) is below minimum threshold (${config.minSolBalance})`);
      }
      
      // Check USDC balance
      const usdcBalance = await this.getUsdcBalance();
      logger.info(`Wallet USDC balance: ${usdcBalance} USDC`);
      
      logger.info('Wallet manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize wallet manager', error);
      throw error;
    }
  }

  /**
   * Gets the wallet's SOL balance
   * @returns SOL balance in SOL units (not lamports)
   */
  public async getSolBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletAddress);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      logger.error('Failed to get SOL balance', error);
      throw error;
    }
  }

  /**
   * Gets the wallet's USDC balance
   * @returns USDC balance as a decimal number
   */
  public async getUsdcBalance(): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        config.usdcMint,
        this.walletAddress
      );
      
      try {
        const accountInfo = await getAccount(this.connection, tokenAccount);
        return Number(accountInfo.amount) / Math.pow(10, 6); // USDC has 6 decimals
      } catch (error) {
        if (error.name === 'TokenAccountNotFoundError') {
          return 0;
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to get USDC balance', error);
      throw error;
    }
  }

  /**
   * Checks if the wallet has sufficient SOL for transaction fees
   * @returns True if the wallet has at least the minimum required SOL balance
   */
  public async hasSufficientSolForFees(): Promise<boolean> {
    const balance = await this.getSolBalance();
    return balance >= config.minSolBalance;
  }

  /**
   * Gets the wallet address
   * @returns The public key of the wallet
   */
  public getWalletAddress(): string {
    return this.walletAddress.toString();
  }

  /**
   * Gets the wallet keypair
   * @returns The wallet keypair
   */
  public getKeypair(): Keypair {
    return this.keypair;
  }

  /**
   * Gets token balances for both SOL and USDC
   * @returns Object containing SOL and USDC balances
   */
  public async getTokenBalances(): Promise<{ sol: number; usdc: number }> {
    const [sol, usdc] = await Promise.all([
      this.getSolBalance(),
      this.getUsdcBalance()
    ]);
    
    return { sol, usdc };
  }
}