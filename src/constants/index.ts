import { PublicKey } from '@solana/web3.js';

/**
 * Solana and Raydium constants
 */
export const CONSTANTS = {
  // Known Solana token mint addresses
  MINTS: {
    SOL: new PublicKey('So11111111111111111111111111111111111111112'),
    USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  },
  
  // Solana program IDs
  PROGRAMS: {
    TOKEN_PROGRAM_ID: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    ASSOCIATED_TOKEN_PROGRAM_ID: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    SYSTEM_PROGRAM_ID: new PublicKey('11111111111111111111111111111111'),
    RAYDIUM_AMM_V3_PROGRAM_ID: new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'),
  },
  
  // Discord embed colors
  COLORS: {
    SUCCESS: 0x2ECC71, // Green
    WARNING: 0xF39C12, // Orange
    ERROR: 0xE74C3C,   // Red
    INFO: 0x3498DB,    // Blue
    DEFAULT: 0x7289DA  // Discord blurple
  },
  
  // Fee defaults
  FEES: {
    DEFAULT_SLIPPAGE_PERCENT: 1, // 1% default slippage tolerance
    DEFAULT_PRIORITY_FEE: 1000, // 1000 micro lamports per compute unit
  },
  
  // Position management
  POSITION: {
    // Minimum position size to avoid dust positions
    MIN_POSITION_VALUE_USDC: 10,
    // Minimum amounts for tokens
    MIN_SOL_AMOUNT: 0.01,
    MIN_USDC_AMOUNT: 5,
  }
};

export default CONSTANTS;