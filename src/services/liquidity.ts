import { Connection } from '@solana/web3.js';
import { RaydiumService } from './raydium.js';
import { WalletManager } from './wallet.js';
import { NotificationService } from './notification.js';
import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';

// Create service-specific logger
const logger = createContextLogger('LiquidityManager');

/**
 * Manages liquidity positions according to the strategy
 */
export class LiquidityManager {
  private connection: Connection;
  private walletManager: WalletManager;
  private raydiumService: RaydiumService;
  private notificationService: NotificationService;
  private isInitialized: boolean = false;

  constructor(
    connection: Connection,
    walletManager: WalletManager,
    notificationService: NotificationService
  ) {
    this.connection = connection;
    this.walletManager = walletManager;
    this.notificationService = notificationService;
    this.raydiumService = new RaydiumService(
      connection,
      walletManager.getKeypair()
    );
  }

  /**
   * Initializes the liquidity manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('Initializing liquidity manager');
    
    try {
      // Initialize Raydium service
      await this.raydiumService.initialize();
      
      // Get current price and price range
      const currentPrice = await this.raydiumService.getCurrentPrice();
      const { lowerBound, upperBound } = await this.raydiumService.getPriceRange();
      
      logger.info(`Current SOL price: $${currentPrice.toFixed(4)}`);
      logger.info(`Target price range: $${lowerBound.toFixed(4)} - $${upperBound.toFixed(4)}`);
      
      this.isInitialized = true;
      logger.info('Liquidity manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize liquidity manager', error);
      throw error;
    }
  }

  /**
   * Manages all liquidity positions according to the strategy
   */
  public async managePositions(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      logger.info('Starting position management cycle');
      
      // Get current price and target range
      const currentPrice = await this.raydiumService.getCurrentPrice();
      const { lowerBound, upperBound } = await this.raydiumService.getPriceRange();
      
      // Send price update notification
      await this.notificationService.sendPriceUpdateNotification({
        current: currentPrice,
        change24h: 0, // Would be fetched from an external API in a real implementation
        lowerBound,
        upperBound
      });
      
      // Get current wallet balances
      const { sol, usdc } = await this.walletManager.getTokenBalances();
      logger.info(`Current balances: ${sol.toFixed(4)} SOL, ${usdc.toFixed(2)} USDC`);
      
      // Get existing positions
      const positions = await this.raydiumService.getPositions();
      logger.info(`Found ${positions.length} existing positions`);
      
      // Check if we need to close any out-of-range positions
      let positionClosed = false;
      for (const position of positions) {
        const isInRange = await this.raydiumService.isPositionInRange(position);
        
        if (!isInRange) {
          logger.info(`Position ${position.positionId} is out of range, closing`);
          
          try {
            // Close the position
            const signature = await this.raydiumService.closePosition(position.positionId);
            
            // Send notification
            await this.notificationService.sendPositionWithdrawnNotification({
              id: position.positionId,
              lowerPrice: position.lowerPrice,
              upperPrice: position.upperPrice,
              solAmount: position.solAmount,
              usdcAmount: position.usdcAmount,
              inRange: false
            });
            
            // Send transaction notification
            await this.notificationService.sendTransactionNotification({
              type: 'withdraw',
              signature,
              solAmount: position.solAmount,
              usdcAmount: position.usdcAmount,
              positionId: position.positionId
            });
            
            positionClosed = true;
          } catch (error) {
            logger.error(`Failed to close position ${position.positionId}`, error);
            await this.notificationService.sendErrorNotification(
              `Failed to close position ${position.positionId}`,
              error
            );
          }
        } else {
          logger.info(`Position ${position.positionId} is in range, keeping`);
        }
      }
      
      // If we closed a position, update the wallet balances
      if (positionClosed) {
        const updatedBalances = await this.walletManager.getTokenBalances();
        await this.notificationService.sendBalanceNotification(updatedBalances);
        logger.info(`Updated balances after closing positions: ${updatedBalances.sol.toFixed(4)} SOL, ${updatedBalances.usdc.toFixed(2)} USDC`);
      }
      
      // Check if we have enough funds to open a new position
      const updatedBalances = await this.walletManager.getTokenBalances();
      
      // Only open a new position if we have at least 0.1 SOL and 10 USDC
      const minSolForPosition = 0.1;
      const minUsdcForPosition = 10;
      
      // Reserve some SOL for transaction fees
      const availableSol = updatedBalances.sol - config.minSolBalance;
      
      if (availableSol >= minSolForPosition && updatedBalances.usdc >= minUsdcForPosition) {
        logger.info('Creating new position with available funds');
        
        // Calculate total available value in USDC
        const totalValueUSDC = availableSol * currentPrice + updatedBalances.usdc;
        
        // Get optimal amounts for the current price range
        const { solAmount, usdcAmount } = await this.raydiumService.getOptimalAmounts(
          lowerBound,
          upperBound,
          totalValueUSDC * 0.98 // Use 98% of available funds to leave some buffer
        );
        
        // Ensure we don't exceed available balances
        const finalSolAmount = Math.min(solAmount, availableSol);
        const finalUsdcAmount = Math.min(usdcAmount, updatedBalances.usdc);
        
        try {
          // Create the position
          const signature = await this.raydiumService.createPosition(
            finalSolAmount,
            finalUsdcAmount,
            lowerBound,
            upperBound
          );
          
          // Get position ID from transaction (simplified here, would require parsing transaction info)
          const positionId = "new-position-" + Date.now().toString();
          
          // Send notifications
          await this.notificationService.sendPositionCreatedNotification({
            id: positionId,
            lowerPrice: lowerBound,
            upperPrice: upperBound,
            solAmount: finalSolAmount,
            usdcAmount: finalUsdcAmount,
            inRange: true
          });
          
          await this.notificationService.sendTransactionNotification({
            type: 'deposit',
            signature,
            solAmount: finalSolAmount,
            usdcAmount: finalUsdcAmount,
            positionId
          });
          
          // Update balances after creating position
          const newBalances = await this.walletManager.getTokenBalances();
          await this.notificationService.sendBalanceNotification(newBalances);
          
          logger.info(`New position created successfully with ${finalSolAmount.toFixed(4)} SOL and ${finalUsdcAmount.toFixed(2)} USDC`);
        } catch (error) {
          logger.error('Failed to create new position', error);
          await this.notificationService.sendErrorNotification(
            'Failed to create new position',
            error
          );
        }
      } else {
        logger.info('Insufficient funds to create a new position');
        logger.info(`Requires minimum ${minSolForPosition} SOL and ${minUsdcForPosition} USDC`);
        logger.info(`Available: ${availableSol.toFixed(4)} SOL and ${updatedBalances.usdc.toFixed(2)} USDC`);
      }
      
      logger.info('Position management cycle completed');
    } catch (error) {
      logger.error('Error managing positions', error);
      await this.notificationService.sendErrorNotification(
        'Error during position management cycle',
        error
      );
    }
  }
}