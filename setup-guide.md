# Raydium Liquidity Bot Setup Guide

This guide will walk you through setting up the Raydium SOL-USDC Liquidity Management Bot on a DigitalOcean server. The guide is designed to be accessible to users without technical experience.

## 1. Creating a DigitalOcean Droplet

1. **Sign up for DigitalOcean**: Create an account at [DigitalOcean](https://www.digitalocean.com/).

2. **Create a Droplet**:
   - Click "Create" and select "Droplet"
   - Choose the following options:
     - **Region**: Select a region close to you
     - **Image**: Ubuntu 22.04 LTS
     - **Plan**: Basic Shared CPU (2GB RAM / 1 CPU)
     - **Authentication**: Password (create a strong password)
     - **Hostname**: Choose a name like "raydium-bot"
   - Click "Create Droplet"

3. **Access Your Droplet**:
   - From the DigitalOcean dashboard, copy your Droplet's IP address
   - On Windows: Use PuTTY to connect
   - On Mac/Linux: Open Terminal and type `ssh root@YOUR_DROPLET_IP`
   - Enter your password when prompted

## 2. Setting Up the Server

1. **Update the system**:
   ```
   apt update && apt upgrade -y
   ```

2. **Install Node.js and npm**:
   ```
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   apt-get install -y nodejs
   ```

3. **Verify the installation**:
   ```
   node -v
   npm -v
   ```
   Both commands should show version numbers.

4. **Install Git**:
   ```
   apt install git -y
   ```

5. **Create a directory for the bot**:
   ```
   mkdir -p /opt/raydium-bot
   cd /opt/raydium-bot
   ```

## 3. Setting Up the Bot

1. **Clone the repository**:
   ```
   git clone https://github.com/yourusername/raydium-liquidity-bot.git .
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Create the configuration file**:
   ```
   cp .env.example .env
   nano .env
   ```

4. **Edit the configuration**:
   Fill in the following values:
   - `SOLANA_RPC_URL`: Your Solana RPC URL (e.g., from QuickNode)
   - `NETWORK`: Set to `mainnet-beta`
   - `WALLET_PRIVATE_KEY`: Your wallet's private key in base58 format
   - `POOL_ID`: The SOL-USDC pool ID
   - `DISCORD_WEBHOOK_URL`: Your Discord webhook URL

   To save and exit: Press `Ctrl+X`, then `Y`, then `Enter`

5. **Build the bot**:
   ```
   npm run build
   ```

## 4. Creating a Discord Webhook

1. **Open Discord** and go to the server where you want to receive notifications

2. **Create a channel** for bot notifications (or use an existing one)

3. **Get the webhook URL**:
   - Click the gear icon next to the channel name
   - Select "Integrations"
   - Click "Create Webhook"
   - Give it a name like "Raydium Bot"
   - Click "Copy Webhook URL"
   - Click "Save"

4. **Add the webhook URL** to your `.env` file (DISCORD_WEBHOOK_URL)

## 5. Obtaining Your Solana Wallet Private Key

**WARNING: Your private key gives full access to your funds. Keep it secure!**

1. From **Phantom Wallet**:
   - Click the hamburger menu (three lines)
   - Go to "Settings"
   - Click "Show Secret Recovery Phrase"
   - Enter your password
   - Copy your seed phrase
   - Use a tool like [https://github.com/solana-labs/solana/tree/master/web3.js/bin/keypair](https://github.com/solana-labs/solana/tree/master/web3.js/bin/keypair) to convert your seed phrase to a base58 private key

2. From **Solflare**:
   - Click the gear icon
   - Click "Export Private Key"
   - Enter your password
   - Copy the private key

## 6. Running the Bot

1. **Install PM2** to keep the bot running:
   ```
   npm install -g pm2
   ```

2. **Start the bot**:
   ```
   pm2 start dist/index.js --name raydium-bot
   ```

3. **Check the bot status**:
   ```
   pm2 status
   ```

4. **View the logs**:
   ```
   pm2 logs raydium-bot
   ```

5. **Make the bot start automatically after reboot**:
   ```
   pm2 startup
   ```
   Run the command that PM2 outputs.

   Then:
   ```
   pm2 save
   ```

## 7. Monitoring and Managing the Bot

1. **View logs**:
   ```
   pm2 logs raydium-bot
   ```

2. **Stop the bot**:
   ```
   pm2 stop raydium-bot
   ```

3. **Restart the bot**:
   ```
   pm2 restart raydium-bot
   ```

4. **Update the bot**:
   ```
   cd /opt/raydium-bot
   git pull
   npm install
   npm run build
   pm2 restart raydium-bot
   ```

## 8. Securing Your Server

1. **Create a new user** (more secure than using root):
   ```
   adduser botuser
   usermod -aG sudo botuser
   ```

2. **Set up a firewall**:
   ```
   ufw allow OpenSSH
   ufw enable
   ```

3. **Set up SSH keys** for more secure login (optional but recommended):
   - On your local machine, generate SSH keys: `ssh-keygen -t rsa -b 4096`
   - Copy your public key to the server: `ssh-copy-id botuser@YOUR_DROPLET_IP`
   - Disable password authentication (after verifying SSH keys work):
     ```
     sudo nano /etc/ssh/sshd_config
     ```
     Change `PasswordAuthentication yes` to `PasswordAuthentication no`
     ```
     sudo systemctl restart sshd
     ```

## Troubleshooting

1. **Bot crashes on startup**:
   - Check logs: `pm2 logs raydium-bot`
   - Verify your `.env` configuration
   - Ensure your wallet has SOL and USDC

2. **No Discord notifications**:
   - Verify your webhook URL is correct
   - Check if the bot is running: `pm2 status`

3. **Transaction errors**:
   - Ensure your wallet has enough SOL for transaction fees
   - Try using a different RPC URL
   - Check if the price range is too narrow

4. **Server connection issues**:
   - Verify your firewall settings: `ufw status`
   - Check SSH configuration: `nano /etc/ssh/sshd_config`

## Support

If you encounter issues not covered in this guide, please open an issue on the GitHub repository or contact the developer.

Remember to keep your private key secure and never share it with anyone!