import {
  Liquidity,
  LiquidityPoolKeys,
  TokenAmount,
  Token as SDKToken,
  Price,
  ZERO,
  Percent,
  ClmmPoolInfo,
  AmmV3,
  ApiV3PoolInfoItem
} from '@raydium-io/raydium-sdk';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { BN } from 'bn.js';
import { config } from '../config/index.js';
import { sendTransactionWithRetry } from './blockchain.js';
import { createContextLogger } from '../utils/logger.js';

// Create service-specific logger
const logger = createContextLogger('RaydiumService');

// Raydium constants
const PRICE_TICK_ARRAY_SIZE = 73;

/**
 * Service for interacting with Raydium protocol
 */
export class RaydiumService {
  private connection: Connection;
  private keypair: Keypair;
  private poolId: PublicKey;
  private poolInfo: ClmmPoolInfo | null = null;
  private poolKeys: LiquidityPoolKeys | null = null;

  constructor(connection: Connection, keypair: Keypair) {
    this.connection = connection;
    this.keypair = keypair;
    this.poolId = new PublicKey(config.poolId);
  }

  /**
   * Initializes the Raydium service
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing Raydium service');
    
    try {
      // Fetch pool information
      await this.fetchPoolInfo();
      logger.info('Raydium service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Raydium service', error);
      throw error;
    }
  }

  /**
   * Fetches information about the liquidity pool
   */
  private async fetchPoolInfo(): Promise<void> {
    try {
      logger.info(`Fetching pool info for pool ID ${this.poolId.toString()}`);
      
      // Create pool keys object
      this.poolKeys = {
        id: this.poolId,
        baseMint: config.solMint,
        quoteMint: config.usdcMint,
        lpMint: PublicKey.default,
        baseDecimals: 9, // SOL has 9 decimals
        quoteDecimals: 6, // USDC has 6 decimals
        lpDecimals: 0, // Will be populated when fetching pool info
        version: 4, // Version 4 for CLMM
        programId: AmmV3.PROGRAM_ID_V4,
        authority: PublicKey.default, // Will be populated when fetching pool info
        openOrders: PublicKey.default, // Will be populated when fetching pool info
        targetOrders: PublicKey.default, // Will be populated when fetching pool info
        baseVault: PublicKey.default, // Will be populated when fetching pool info
        quoteVault: PublicKey.default, // Will be populated when fetching pool info
        marketId: PublicKey.default, // Will be populated when fetching pool info
        marketProgramId: PublicKey.default, // Will be populated when fetching pool info
        marketAuthority: PublicKey.default, // Will be populated when fetching pool info
        marketBaseVault: PublicKey.default, // Will be populated when fetching pool info
        marketQuoteVault: PublicKey.default, // Will be populated when fetching pool info
        marketBids: PublicKey.default, // Will be populated when fetching pool info
        marketAsks: PublicKey.default, // Will be populated when fetching pool info
        marketEventQueue: PublicKey.default // Will be populated when fetching pool info
      };
      
      // Fetch pool info from Raydium SDK
      const poolInfos = await AmmV3.fetchMultiplePoolInfos({
        connection: this.connection,
        poolKeys: [this.poolKeys],
      });
      
      if (poolInfos.length === 0) {
        throw new Error(`Pool not found: ${this.poolId.toString()}`);
      }
      
      this.poolInfo = poolInfos[0];
      
      logger.info('Successfully fetched pool info', {
        sqrtPrice: this.poolInfo.sqrtPriceX64.toString(),
        liquidity: this.poolInfo.liquidity.toString(),
        fee: this.poolInfo.fee.toString(),
      });
    } catch (error) {
      logger.error('Failed to fetch pool info', error);
      throw error;
    }
  }

  /**
   * Gets the current price from the pool
   * @returns Current price of SOL in USDC
   */
  public async getCurrentPrice(): Promise<number> {
    if (!this.poolInfo) {
      await this.fetchPoolInfo();
    }
    
    if (!this.poolInfo) {
      throw new Error('Pool info not available');
    }
    
    // Convert the sqrtPriceX64 to a price
    const price = AmmV3.getCurrencyAmount(
      this.poolInfo.sqrtPriceX64,
      true,
      9, // SOL decimals
      6, // USDC decimals
      true
    );
    
    return price;
  }

  /**
   * Gets the price range based on the current price and configured percentage
   * @returns Lower and upper bound prices
   */
  public async getPriceRange(): Promise<{ lowerBound: number; upperBound: number }> {
    const currentPrice = await this.getCurrentPrice();
    const rangePercent = config.priceRangePercent / 100;
    
    const lowerBound = currentPrice * (1 - rangePercent);
    const upperBound = currentPrice * (1 + rangePercent);
    
    return { lowerBound, upperBound };
  }

  /**
   * Calculates the price tick indexes for the price range
   * @param lowerPrice Lower bound price
   * @param upperPrice Upper bound price
   * @returns Lower and upper tick indexes
   */
  private async calculateTickIndexes(
    lowerPrice: number,
    upperPrice: number
  ): Promise<{ lowerTickIndex: number; upperTickIndex: number }> {
    if (!this.poolInfo) {
      throw new Error('Pool info not available');
    }
    
    const tickSpacing = this.poolInfo.tickSpacing;
    
    // Convert prices to tick indexes
    let lowerTickIndex = AmmV3.priceToTickIndex(
      new Price(
        new SDKToken(config.solMint.toString(), 9),
        new SDKToken(config.usdcMint.toString(), 6),
        1,
        lowerPrice
      ),
      tickSpacing
    );
    
    let upperTickIndex = AmmV3.priceToTickIndex(
      new Price(
        new SDKToken(config.solMint.toString(), 9),
        new SDKToken(config.usdcMint.toString(), 6),
        1,
        upperPrice
      ),
      tickSpacing
    );
    
    // Ensure the tick indexes are valid and aligned with tick spacing
    lowerTickIndex = Math.floor(lowerTickIndex / tickSpacing) * tickSpacing;
    upperTickIndex = Math.ceil(upperTickIndex / tickSpacing) * tickSpacing;
    
    return { lowerTickIndex, upperTickIndex };
  }

  /**
   * Creates a new liquidity position
   * @param solAmount Amount of SOL to provide
   * @param usdcAmount Amount of USDC to provide
   * @param lowerPrice Lower bound price
   * @param upperPrice Upper bound price
   * @returns Transaction signature
   */
  public async createPosition(
    solAmount: number,
    usdcAmount: number,
    lowerPrice: number,
    upperPrice: number
  ): Promise<string> {
    if (!this.poolInfo || !this.poolKeys) {
      throw new Error('Pool info not available');
    }
    
    try {
      logger.info(`Creating position with ${solAmount} SOL and ${usdcAmount} USDC at price range $${lowerPrice.toFixed(4)} - $${upperPrice.toFixed(4)}`);
      
      // Calculate tick indexes for the price range
      const { lowerTickIndex, upperTickIndex } = await this.calculateTickIndexes(lowerPrice, upperPrice);
      
      logger.info(`Tick indexes: lower=${lowerTickIndex}, upper=${upperTickIndex}`);
      
      // Convert amounts to TokenAmount objects
      const solTokenAmount = new TokenAmount(
        new SDKToken(config.solMint.toString(), 9),
        new BN(solAmount * 1e9)
      );
      
      const usdcTokenAmount = new TokenAmount(
        new SDKToken(config.usdcMint.toString(), 6),
        new BN(usdcAmount * 1e6)
      );
      
      // Create transaction instruction
      const { transaction, signers } = await AmmV3.makeOpenPositionInstructionSimple({
        connection: this.connection,
        poolInfo: this.poolInfo,
        ownerInfo: {
          feePayer: this.keypair.publicKey,
          wallet: this.keypair.publicKey,
          tokenAccounts: [], // Will be fetched internally by the SDK
        },
        withMetadata: true,
        tickLower: lowerTickIndex,
        tickUpper: upperTickIndex,
        amountMaxA: solTokenAmount,
        amountMaxB: usdcTokenAmount,
        slippage: new Percent(new BN(1), new BN(100)), // 1% slippage tolerance
        computeBudgetConfig: {
          microLamports: 100000, // Increased compute budget to avoid failures
          units: 400000,
        },
      });
      
      // Add compute budget instruction to avoid compute limit errors
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000, // Increasing compute units for CLMM operations
      });
      
      transaction.instructions.unshift(modifyComputeUnits);
      
      // Send transaction with retries
      const signature = await sendTransactionWithRetry(
        transaction,
        [this.keypair, ...signers],
        config.maxRetryAttempts
      );
      
      logger.info(`Position created successfully: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Failed to create position', error);
      throw error;
    }
  }

  /**
   * Gets all positions for the wallet
   * @returns Array of position information
   */
  public async getPositions(): Promise<any[]> {
    if (!this.poolInfo) {
      await this.fetchPoolInfo();
    }
    
    try {
      logger.info('Fetching positions for wallet');
      
      // Fetch positions using SDK
      const positions = await AmmV3.fetchMultiplePoolTickArrays({
        connection: this.connection,
        poolKeys: [this.poolKeys!],
        tickArrayStartIndexes: Array.from(
          { length: PRICE_TICK_ARRAY_SIZE },
          (_, i) => i - Math.floor(PRICE_TICK_ARRAY_SIZE / 2)
        ),
      });
      
      // Filter positions for the wallet
      const walletPositions = positions.filter(
        position => position.ownerAddress.equals(this.keypair.publicKey)
      );
      
      logger.info(`Found ${walletPositions.length} positions for wallet`);
      return walletPositions;
    } catch (error) {
      logger.error('Failed to fetch positions', error);
      return [];
    }
  }

  /**
   * Checks if a position is within the current price range
   * @param position Position to check
   * @returns True if the position is in range
   */
  public async isPositionInRange(position: any): Promise<boolean> {
    const currentPrice = await this.getCurrentPrice();
    
    // Check if the position's price range contains the current price
    return currentPrice >= position.lowerPrice && currentPrice <= position.upperPrice;
  }

  /**
   * Closes a liquidity position
   * @param positionId Position ID to close
   * @returns Transaction signature
   */
  public async closePosition(positionId: string): Promise<string> {
    if (!this.poolInfo || !this.poolKeys) {
      throw new Error('Pool info not available');
    }
    
    try {
      logger.info(`Closing position ${positionId}`);
      
      // Create transaction instruction
      const { transaction, signers } = await AmmV3.makeClosePositionInstructionSimple({
        connection: this.connection,
        poolInfo: this.poolInfo,
        ownerInfo: {
          feePayer: this.keypair.publicKey,
          wallet: this.keypair.publicKey,
          tokenAccounts: [], // Will be fetched internally by the SDK
        },
        positionId: new PublicKey(positionId),
        slippage: new Percent(new BN(1), new BN(100)), // 1% slippage tolerance
        computeBudgetConfig: {
          microLamports: 100000,
          units: 400000,
        },
      });
      
      // Add compute budget instruction to avoid compute limit errors
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000,
      });
      
      transaction.instructions.unshift(modifyComputeUnits);
      
      // Send transaction with retries
      const signature = await sendTransactionWithRetry(
        transaction,
        [this.keypair, ...signers],
        config.maxRetryAttempts
      );
      
      logger.info(`Position closed successfully: ${signature}`);
      return signature;
    } catch (error) {
      logger.error(`Failed to close position ${positionId}`, error);
      throw error;
    }
  }

  /**
   * Gets the optimal token amounts for a price range
   * @param lowerPrice Lower bound price
   * @param upperPrice Upper bound price
   * @param totalValue Total value in USDC to provide
   * @returns Optimal SOL and USDC amounts
   */
  public async getOptimalAmounts(
    lowerPrice: number,
    upperPrice: number,
    totalValue: number
  ): Promise<{ solAmount: number; usdcAmount: number }> {
    const currentPrice = await this.getCurrentPrice();
    
    // Calculate L (liquidity) based on concentrated liquidity formula
    const sqrtPriceLower = Math.sqrt(lowerPrice);
    const sqrtPriceUpper = Math.sqrt(upperPrice);
    const sqrtPriceCurrent = Math.sqrt(currentPrice);
    
    // Calculate the liquidity value
    let solAmount = 0;
    let usdcAmount = 0;
    
    if (currentPrice <= lowerPrice) {
      // All USDC, no SOL
      usdcAmount = totalValue;
    } else if (currentPrice >= upperPrice) {
      // All SOL, no USDC
      solAmount = totalValue / currentPrice;
    } else {
      // Mixed allocation based on the position within the range
      const weight = (sqrtPriceUpper - sqrtPriceCurrent) / (sqrtPriceUpper - sqrtPriceLower);
      solAmount = (totalValue / currentPrice) * (1 - weight);
      usdcAmount = totalValue * weight;
    }
    
    return { solAmount, usdcAmount };
  }
}