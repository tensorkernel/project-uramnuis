import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { LiquidityManager } from './services/liquidity.js';
import { NotificationService } from './services/notification.js';
import { initializeConnection } from './services/blockchain.js';
import { WalletManager } from './services/wallet.js';
import cron from 'node-cron';
import chalk from 'chalk';

/**
 * Main entry point for the Raydium Liquidity Bot
 */
async function main() {
  try {
    // Application startup banner
    console.log(chalk.cyan('============================================'));
    console.log(chalk.cyan('  RAYDIUM SOL-USDC LIQUIDITY MANAGER BOT'));
    console.log(chalk.cyan('============================================'));
    console.log(chalk.gray(`  Network: ${config.network}`));
    console.log(chalk.gray(`  Pool: SOL-USDC`));
    console.log(chalk.gray(`  Price Range: ${config.priceRangePercent}%`));
    console.log(chalk.gray(`  Check Interval: ${config.checkIntervalMinutes} minutes`));
    console.log(chalk.cyan('============================================\n'));

    // Initialize services
    logger.info('Initializing Raydium Liquidity Bot...');
    const connection = await initializeConnection();
    logger.info(`Connected to Solana ${config.network}`);

    const walletManager = new WalletManager(connection);
    await walletManager.initialize();

    const notificationService = new NotificationService();
    await notificationService.initialize();
    
    const liquidityManager = new LiquidityManager(connection, walletManager, notificationService);
    await liquidityManager.initialize();

    // Send startup notification
    await notificationService.sendStartupNotification({
      network: config.network,
      poolId: config.poolId,
      priceRange: config.priceRangePercent,
      walletAddress: walletManager.getWalletAddress()
    });

    // Initial check
    logger.info('Performing initial position check and management...');
    await liquidityManager.managePositions();

    // Schedule regular checks
    logger.info(`Scheduling position checks every ${config.checkIntervalMinutes} minutes`);
    cron.schedule(`*/${config.checkIntervalMinutes} * * * *`, async () => {
      try {
        logger.info('Running scheduled position check and management...');
        await liquidityManager.managePositions();
      } catch (error) {
        logger.error('Error during scheduled position management:', error);
        await notificationService.sendErrorNotification('Scheduled position management failed', error);
      }
    });

    logger.info('Bot is running. Press CTRL+C to stop.');
  } catch (error) {
    logger.error('Fatal error during bot initialization:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Gracefully shutting down...');
  try {
    const notificationService = new NotificationService();
    await notificationService.sendShutdownNotification();
  } catch (error) {
    logger.error('Error sending shutdown notification:', error);
  }
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', error);
  try {
    const notificationService = new NotificationService();
    await notificationService.sendErrorNotification('Uncaught exception', error);
  } catch (notifyError) {
    logger.error('Error sending error notification:', notifyError);
  }
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  logger.error('Unhandled error in main function:', error);
  process.exit(1);
});