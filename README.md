# Raydium SOL-USDC Liquidity Management Bot

A professional-grade bot for managing liquidity positions in the SOL-USDC Concentrated Liquidity Market Maker (CLMM) pool on Raydium.

## Features

- Automatically manages liquidity positions within a configurable price range (default ±5%)
- Monitors positions and withdraws liquidity when out of range
- Creates new positions with optimal token distribution
- Sends notifications to Discord for all key events
- Detailed logging for monitoring and troubleshooting
- Secure management of wallet private keys through environment variables

## Prerequisites

- Node.js 18 or higher
- A Solana wallet with SOL and USDC
- Discord webhook URL for notifications

## Configuration

All configuration is done through environment variables. Copy `.env.example` to `.env` and fill in the values:

```
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NETWORK=mainnet-beta

# Wallet Configuration (KEEP PRIVATE KEY SECURE)
WALLET_PRIVATE_KEY=your_base58_encoded_private_key

# Raydium Configuration
# SOL-USDC Concentrated Liquidity Pool ID
POOL_ID=your_pool_id

# SOL and USDC mint addresses
SOL_MINT=So11111111111111111111111111111111111111112
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Liquidity Bot Configuration
# Range percentage for liquidity provision (e.g., 5 for 5%)
PRICE_RANGE_PERCENT=5
# Minimum amount of SOL to keep in wallet
MIN_SOL_BALANCE=0.05
# Check positions every X minutes
CHECK_INTERVAL_MINUTES=5
# How many times to retry failed operations before giving up
MAX_RETRY_ATTEMPTS=3

# Discord Webhook for Notifications
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Logging Configuration
LOG_LEVEL=info
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/raydium-liquidity-bot.git
   cd raydium-liquidity-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Usage

Start the bot:

```
npm start
```

The bot will:
1. Initialize connections to Solana and Raydium
2. Check your current wallet balances
3. Scan for existing positions
4. Withdraw any out-of-range positions
5. Create new positions with an optimal distribution
6. Send notifications at each step
7. Schedule regular checks at the configured interval

## Monitoring

The bot provides several monitoring options:

1. Console output with color-coded log messages
2. Log files in the `logs` directory
3. Discord notifications for all key events

## Notifications

The bot sends the following types of notifications to Discord:

- Bot startup and shutdown
- Position creation and withdrawal
- Wallet balance updates
- Price updates
- Transaction confirmations
- Error notifications

## Security Considerations

- Never commit your `.env` file or expose your wallet private key
- Use a dedicated wallet for the bot with only the necessary funds
- Consider running the bot on a secure, dedicated server
- Regularly monitor the bot's activities through logs and Discord notifications

## Advanced Configuration

You can modify the bot's behavior by adjusting the environment variables:

- `PRICE_RANGE_PERCENT`: Adjust this value to change the price range for liquidity positions
- `CHECK_INTERVAL_MINUTES`: Change how frequently the bot checks and manages positions
- `MIN_SOL_BALANCE`: Set the minimum SOL to keep for transaction fees
- `MAX_RETRY_ATTEMPTS`: Adjust how many times the bot retries failed operations

## Troubleshooting

Common issues:

1. **Insufficient SOL for transaction fees**: Ensure your wallet has enough SOL for transaction fees (at least the value set in `MIN_SOL_BALANCE`)

2. **RPC errors**: If you encounter frequent RPC errors, consider using a more reliable RPC provider

3. **Transaction failures**: Check the logs for specific error messages. Common issues include slippage tolerance and compute budget limits

## License

MIT