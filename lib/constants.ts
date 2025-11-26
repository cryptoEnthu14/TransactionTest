import { clusterApiUrl } from '@solana/web3.js';

export const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const RPC_ENDPOINT =
  NETWORK === 'mainnet-beta'
    ? process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('mainnet-beta')
    : clusterApiUrl('devnet');

export const EXPLORER_URL = `https://explorer.solana.com`;

export const TOKEN_DECIMALS = 9;
export const MAX_PREPURCHASE_AMOUNT = 1_000_000_000; // 1 billion tokens max
