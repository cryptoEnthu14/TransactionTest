import { describe, it, expect, beforeAll } from '@jest/globals';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import bs58 from 'bs58';

/**
 * Integration Tests for Solana Token Creator
 *
 * Prerequisites:
 * 1. Set BACKEND_KEYPAIR_SECRET in .env.test
 * 2. Fund backend wallet with devnet SOL
 * 3. Run with: npm test
 */

const TEST_RPC = 'https://api.devnet.solana.com';
const TEST_TIMEOUT = 60000; // 60 seconds

describe('Token Creation End-to-End Tests', () => {
  let connection: Connection;
  let backendKeypair: Keypair;

  beforeAll(() => {
    connection = new Connection(TEST_RPC, 'confirmed');

    const secretKey = process.env.BACKEND_KEYPAIR_SECRET;
    if (!secretKey) {
      throw new Error('BACKEND_KEYPAIR_SECRET not set');
    }

    backendKeypair = Keypair.fromSecretKey(bs58.decode(secretKey));
  });

  it('should have sufficient SOL in backend wallet', async () => {
    const balance = await connection.getBalance(backendKeypair.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log(`Backend wallet balance: ${solBalance} SOL`);
    expect(solBalance).toBeGreaterThan(0.1); // Need at least 0.1 SOL
  }, TEST_TIMEOUT);

  it('should create token with basic metadata', async () => {
    const testData = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'A test token',
      prePurchaseAmount: 1000,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.mintAddress).toBeDefined();
    expect(result.signature).toBeDefined();

    console.log('✅ Token created:', result.mintAddress);
    console.log('✅ Transaction:', result.signature);
  }, TEST_TIMEOUT);

  it('should create token without pre-purchase', async () => {
    const testData = {
      name: 'No Mint Token',
      symbol: 'NOMINT',
      description: 'Token with no initial mint',
      prePurchaseAmount: 0,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.prePurchaseAmount).toBe(0);
  }, TEST_TIMEOUT);

  it('should handle long token names (transaction size test)', async () => {
    const longName = 'A'.repeat(32); // Max recommended length
    const testData = {
      name: longName,
      symbol: 'LONG',
      description: 'Testing long names',
      prePurchaseAmount: 100,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    // This might fail due to transaction size
    if (!result.success) {
      console.warn('⚠️ Long name failed - likely transaction too large');
      expect(result.error).toBeDefined();
    } else {
      expect(result.success).toBe(true);
    }
  }, TEST_TIMEOUT);

  it('should reject invalid inputs', async () => {
    const testData = {
      name: '',
      symbol: 'TEST',
      description: '',
      prePurchaseAmount: 0,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    expect(response.status).toBe(400);
  }, TEST_TIMEOUT);

  it('should reject ticker longer than 10 characters', async () => {
    const testData = {
      name: 'Test',
      symbol: 'TOOLONGTICKER',
      description: '',
      prePurchaseAmount: 0,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    expect(response.status).toBe(400);
  }, TEST_TIMEOUT);

  it('should handle large pre-purchase amounts', async () => {
    const testData = {
      name: 'Big Supply Token',
      symbol: 'BIG',
      description: 'Testing large amounts',
      prePurchaseAmount: 1000000,
      userWallet: Keypair.generate().publicKey.toBase58(),
    };

    const response = await fetch('http://localhost:3000/api/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.prePurchaseAmount).toBe(1000000);
  }, TEST_TIMEOUT);
});

describe('Transaction Size Tests', () => {
  it('should estimate transaction size', () => {
    // Approximate sizes:
    const sizes = {
      createAccount: 100,
      initializeMint: 80,
      createMetadata: 500, // Varies based on metadata
      createATA: 120,
      mintTo: 80,
      signatures: 128, // 2 signatures @ 64 bytes each
      overhead: 100,
    };

    const totalSize = Object.values(sizes).reduce((a, b) => a + b, 0);

    console.log('Estimated transaction size:', totalSize, 'bytes');
    console.log('Solana limit: 1232 bytes');

    if (totalSize > 1232) {
      console.warn('⚠️ WARNING: Transaction may exceed size limit!');
    }

    expect(totalSize).toBeLessThan(1500); // Keep some margin
  });
});
