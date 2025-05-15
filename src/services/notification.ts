import axios from 'axios';
import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';

// Create service-specific logger
const logger = createContextLogger('NotificationService');

// Type definitions for notification payloads
interface StartupInfo {
  network: string;
  poolId: string;
  priceRange: number;
  walletAddress: string;
}

interface PositionInfo {
  id: string;
  lowerPrice: number;
  upperPrice: number;
  solAmount: number;
  usdcAmount: number;
  inRange: boolean;
}

interface TransactionInfo {
  type: 'deposit' | 'withdraw' | 'rebalance';
  signature: string;
  solAmount?: number;
  usdcAmount?: number;
  positionId?: string;
}

interface PriceInfo {
  current: number;
  change24h: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Service for sending notifications to Discord
 */
export class NotificationService {
  private webhookUrl: string;
  private botName: string = 'Raydium Liquidity Bot';
  private botAvatar: string = 'https://assets.raydium.io/icons/coins/sol.png';

  constructor() {
    this.webhookUrl = config.discordWebhookUrl;
  }

  /**
   * Initializes the notification service
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing notification service');
    
    // Test the webhook connection
    try {
      const testMessage = {
        content: '',
        embeds: [{
          title: '🔄 Bot Initializing',
          description: 'Notification service is being tested',
          color: 0x3498DB, // Blue color
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, testMessage);
      logger.info('Notification service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification service', error);
      throw new Error(`Failed to initialize Discord notification service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends a startup notification
   * @param info Startup information
   */
  public async sendStartupNotification(info: StartupInfo): Promise<void> {
    try {
      const message = {
        content: '',
        embeds: [{
          title: '🚀 Bot Started',
          description: 'Raydium SOL-USDC Liquidity Bot has started',
          color: 0x2ECC71, // Green color
          fields: [
            {
              name: 'Network',
              value: info.network,
              inline: true
            },
            {
              name: 'Wallet',
              value: `\`${info.walletAddress.substring(0, 8)}...\``,
              inline: true
            },
            {
              name: 'Pool',
              value: `SOL-USDC (${info.poolId.substring(0, 8)}...)`,
              inline: true
            },
            {
              name: 'Price Range',
              value: `±${info.priceRange}%`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send startup notification', error);
    }
  }

  /**
   * Sends a notification about a position creation
   * @param position Position information
   */
  public async sendPositionCreatedNotification(position: PositionInfo): Promise<void> {
    try {
      const message = {
        content: '',
        embeds: [{
          title: '🔵 Liquidity Position Created',
          description: `New position created successfully`,
          color: 0x3498DB, // Blue color
          fields: [
            {
              name: 'Position ID',
              value: position.id,
              inline: false
            },
            {
              name: 'Price Range',
              value: `$${position.lowerPrice.toFixed(4)} - $${position.upperPrice.toFixed(4)}`,
              inline: true
            },
            {
              name: 'SOL Amount',
              value: `${position.solAmount.toFixed(4)} SOL`,
              inline: true
            },
            {
              name: 'USDC Amount',
              value: `${position.usdcAmount.toFixed(2)} USDC`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send position created notification', error);
    }
  }

  /**
   * Sends a notification about a position withdrawal
   * @param position Position information
   */
  public async sendPositionWithdrawnNotification(position: PositionInfo): Promise<void> {
    try {
      const message = {
        content: '',
        embeds: [{
          title: '🟠 Liquidity Position Withdrawn',
          description: `Position withdrawn successfully`,
          color: 0xE67E22, // Orange color
          fields: [
            {
              name: 'Position ID',
              value: position.id,
              inline: false
            },
            {
              name: 'Price Range',
              value: `$${position.lowerPrice.toFixed(4)} - $${position.upperPrice.toFixed(4)}`,
              inline: true
            },
            {
              name: 'SOL Amount',
              value: `${position.solAmount.toFixed(4)} SOL`,
              inline: true
            },
            {
              name: 'USDC Amount',
              value: `${position.usdcAmount.toFixed(2)} USDC`,
              inline: true
            },
            {
              name: 'Status',
              value: position.inRange ? 'In Range' : 'Out of Range',
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send position withdrawn notification', error);
    }
  }

  /**
   * Sends a notification about the current wallet balances
   * @param balances Wallet balances
   */
  public async sendBalanceNotification(balances: { sol: number; usdc: number }): Promise<void> {
    try {
      const message = {
        content: '',
        embeds: [{
          title: '💰 Wallet Balances Updated',
          color: 0x9B59B6, // Purple color
          fields: [
            {
              name: 'SOL Balance',
              value: `${balances.sol.toFixed(4)} SOL`,
              inline: true
            },
            {
              name: 'USDC Balance',
              value: `${balances.usdc.toFixed(2)} USDC`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send balance notification', error);
    }
  }

  /**
   * Sends a notification about a transaction
   * @param transaction Transaction information
   */
  public async sendTransactionNotification(transaction: TransactionInfo): Promise<void> {
    try {
      // Determine emoji and color based on transaction type
      let emoji = '📝';
      let color = 0x3498DB; // Blue
      let title = 'Transaction Executed';
      
      switch (transaction.type) {
        case 'deposit':
          emoji = '⬆️';
          color = 0x2ECC71; // Green
          title = 'Liquidity Deposited';
          break;
        case 'withdraw':
          emoji = '⬇️';
          color = 0xE67E22; // Orange
          title = 'Liquidity Withdrawn';
          break;
        case 'rebalance':
          emoji = '🔄';
          color = 0x9B59B6; // Purple
          title = 'Wallet Rebalanced';
          break;
      }
      
      const fields = [
        {
          name: 'Transaction',
          value: `[View on Explorer](https://explorer.solana.com/tx/${transaction.signature})`,
          inline: true
        }
      ];
      
      if (transaction.solAmount !== undefined) {
        fields.push({
          name: 'SOL Amount',
          value: `${transaction.solAmount.toFixed(4)} SOL`,
          inline: true
        });
      }
      
      if (transaction.usdcAmount !== undefined) {
        fields.push({
          name: 'USDC Amount',
          value: `${transaction.usdcAmount.toFixed(2)} USDC`,
          inline: true
        });
      }
      
      if (transaction.positionId) {
        fields.push({
          name: 'Position ID',
          value: transaction.positionId,
          inline: false
        });
      }
      
      const message = {
        content: '',
        embeds: [{
          title: `${emoji} ${title}`,
          color: color,
          fields: fields,
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send transaction notification', error);
    }
  }

  /**
   * Sends a notification about the current price
   * @param price Price information
   */
  public async sendPriceUpdateNotification(price: PriceInfo): Promise<void> {
    try {
      const change24hStr = price.change24h > 0 
        ? `+${price.change24h.toFixed(2)}%` 
        : `${price.change24h.toFixed(2)}%`;
      
      const changeEmoji = price.change24h > 0 ? '📈' : '📉';
      
      let statusEmoji = '✅';
      let statusColor = 0x2ECC71; // Green
      
      if (price.current < price.lowerBound || price.current > price.upperBound) {
        statusEmoji = '⚠️';
        statusColor = 0xE74C3C; // Red
      }
      
      const message = {
        content: '',
        embeds: [{
          title: `${statusEmoji} SOL-USDC Price Update`,
          description: `Current price is ${price.current < price.lowerBound || price.current > price.upperBound ? 'outside' : 'within'} the managed range`,
          color: statusColor,
          fields: [
            {
              name: 'Current Price',
              value: `$${price.current.toFixed(4)}`,
              inline: true
            },
            {
              name: '24h Change',
              value: `${changeEmoji} ${change24hStr}`,
              inline: true
            },
            {
              name: 'Managed Range',
              value: `$${price.lowerBound.toFixed(4)} - $${price.upperBound.toFixed(4)}`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send price update notification', error);
    }
  }

  /**
   * Sends an error notification
   * @param message Error message
   * @param error Error object
   */
  public async sendErrorNotification(message: string, error: any): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      const fields = [
        {
          name: 'Error Message',
          value: errorMessage.substring(0, 1024), // Discord has a 1024 character limit for field values
          inline: false
        }
      ];
      
      if (errorStack) {
        fields.push({
          name: 'Stack Trace',
          value: errorStack.substring(0, 1024),
          inline: false
        });
      }
      
      const discordMessage = {
        content: '',
        embeds: [{
          title: '❌ Error Occurred',
          description: message,
          color: 0xE74C3C, // Red color
          fields: fields,
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, discordMessage);
    } catch (error) {
      logger.error('Failed to send error notification', error);
    }
  }

  /**
   * Sends a shutdown notification
   */
  public async sendShutdownNotification(): Promise<void> {
    try {
      const message = {
        content: '',
        embeds: [{
          title: '🛑 Bot Shutting Down',
          description: 'Raydium SOL-USDC Liquidity Bot is shutting down',
          color: 0xE74C3C, // Red color
          timestamp: new Date().toISOString()
        }]
      };
      
      await axios.post(this.webhookUrl, message);
    } catch (error) {
      logger.error('Failed to send shutdown notification', error);
    }
  }
}