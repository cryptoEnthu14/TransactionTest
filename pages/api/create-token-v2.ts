import type { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  getCreateMetadataAccountV3InstructionDataSerializer,
  type DataV2Args,
} from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function buildCreateMetadataAccountV3Instruction(params: {
  metadataPda: PublicKey;
  mint: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
  updateAuthority: PublicKey;
  data: DataV2Args;
  isMutable?: boolean;
}) {
  const instructionData = getCreateMetadataAccountV3InstructionDataSerializer().serialize({
    data: params.data,
    isMutable: params.isMutable ?? true,
    collectionDetails: null,
  });

  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: params.metadataPda, isSigner: false, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: params.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: params.updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(instructionData),
  });
}

// Solana transaction size limit
const MAX_TRANSACTION_SIZE = 1232;
const COMPUTE_UNIT_LIMIT = 400_000; // Increased compute units for metadata creation
const COMPUTE_UNIT_PRICE = 1; // Micro-lamports per compute unit (priority fee)

interface CreateTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  prePurchaseAmount: number;
  userWallet: string;
}

interface CreateTokenResponse {
  success: boolean;
  mintAddress?: string;
  name?: string;
  symbol?: string;
  description?: string;
  prePurchaseAmount?: number;
  signature?: string;
  mintSignature?: string; // If split into multiple transactions
  userTokenAccount?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Improved Token Creation API with:
 * - Transaction size validation
 * - Compute budget optimization
 * - Priority fees
 * - Split transaction support
 * - Better error handling
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const warnings: string[] = [];

  try {
    const { name, symbol, description, prePurchaseAmount, userWallet }: CreateTokenRequest =
      req.body;

    // Validate inputs
    if (!name || !symbol || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, symbol, or userWallet',
      });
    }

    // Validate name and symbol lengths to prevent transaction size issues
    if (name.length > 32) {
      return res.status(400).json({
        success: false,
        error: 'Token name must be 32 characters or less (Solana transaction size limit)',
      });
    }

    if (symbol.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Symbol must be 10 characters or less',
      });
    }

    if (description && description.length > 200) {
      warnings.push('Description truncated to 200 characters to fit transaction size limit');
    }

    if (prePurchaseAmount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Pre-purchase amount cannot be negative',
      });
    }

    // Initialize Solana connection
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
    const rpcUrl =
      network === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Get backend keypair (mint authority)
    const backendSecretKey = process.env.BACKEND_KEYPAIR_SECRET;
    if (!backendSecretKey) {
      return res.status(500).json({
        success: false,
        error: 'Backend keypair not configured',
      });
    }

    let backendKeypair: Keypair;
    try {
      const secretKeyArray = bs58.decode(backendSecretKey);
      backendKeypair = Keypair.fromSecretKey(secretKeyArray);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Invalid backend keypair format',
      });
    }

    // Validate user wallet address
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(userWallet);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user wallet address',
      });
    }

    // Generate new mint keypair
    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey;

    // Token decimals
    const decimals = 9;

    // Calculate minimum balance for rent exemption
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    // Ensure backend wallet has enough SOL for rent and fees up-front
    const backendBalance = await connection.getBalance(backendKeypair.publicKey);
    const requiredLamports = lamports + Math.ceil(0.01 * LAMPORTS_PER_SOL); // ~0.01 SOL buffer for fees
    if (backendBalance < requiredLamports) {
      return res.status(400).json({
        success: false,
        error: `Backend wallet has insufficient SOL (need at least ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(
          3
        )} SOL). Please fund the backend wallet.`,
      });
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // ========================================
    // TRANSACTION 1: Create Mint + Metadata
    // ========================================
    const tx1 = new Transaction();
    tx1.recentBlockhash = blockhash;
    tx1.feePayer = backendKeypair.publicKey;

    // Add compute budget instructions for better execution
    tx1.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: COMPUTE_UNIT_LIMIT,
      })
    );

    tx1.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: COMPUTE_UNIT_PRICE,
      })
    );

    // 1. Create mint account
    tx1.add(
      SystemProgram.createAccount({
        fromPubkey: backendKeypair.publicKey,
        newAccountPubkey: mintPublicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize mint
    tx1.add(
      createInitializeMintInstruction(
        mintPublicKey,
        decimals,
        backendKeypair.publicKey, // Mint authority
        backendKeypair.publicKey, // Freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // 3. Create metadata account
    const metadataAddress = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    const metadataData = {
      name: name.substring(0, 32), // Ensure max length
      symbol: symbol.substring(0, 10),
      uri: '', // Can be replaced with actual metadata URI
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    } satisfies DataV2Args;

    tx1.add(
      buildCreateMetadataAccountV3Instruction({
        metadataPda: metadataAddress,
        mint: mintPublicKey,
        mintAuthority: backendKeypair.publicKey,
        payer: backendKeypair.publicKey,
        updateAuthority: backendKeypair.publicKey,
        data: metadataData,
      })
    );

    // Check transaction size
    tx1.sign(backendKeypair, mintKeypair);
    const tx1Size = tx1.serialize().length;
    console.log(`Transaction 1 size: ${tx1Size} bytes (limit: ${MAX_TRANSACTION_SIZE})`);

    if (tx1Size > MAX_TRANSACTION_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Transaction too large (${tx1Size} bytes). Try shorter name/symbol.`,
      });
    }

    // Send first transaction
    const signature = await connection.sendRawTransaction(tx1.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Confirm transaction
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    console.log('✅ Mint and metadata created:', mintPublicKey.toBase58());
    console.log('✅ Transaction 1 signature:', signature);

    // ========================================
    // TRANSACTION 2: Mint tokens to user (if requested)
    // ========================================
    let userTokenAccount: PublicKey | undefined;
    let mintSignature: string | undefined;

    if (prePurchaseAmount > 0) {
      // Wait a bit to ensure previous transaction is finalized
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } =
        await connection.getLatestBlockhash('confirmed');

      const tx2 = new Transaction();
      tx2.recentBlockhash = blockhash2;
      tx2.feePayer = backendKeypair.publicKey;

      // Add compute budget
      tx2.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        })
      );

      // Get associated token account address
      userTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        userPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      // Create associated token account
      tx2.add(
        createAssociatedTokenAccountInstruction(
          backendKeypair.publicKey,
          userTokenAccount,
          userPublicKey,
          mintPublicKey,
          TOKEN_PROGRAM_ID
        )
      );

      // Mint tokens to user
      const amount = BigInt(prePurchaseAmount) * BigInt(10 ** decimals);
      tx2.add(
        createMintToInstruction(
          mintPublicKey,
          userTokenAccount,
          backendKeypair.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      tx2.sign(backendKeypair);

      // Send second transaction
      mintSignature = await connection.sendRawTransaction(tx2.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm transaction
      await connection.confirmTransaction(
        {
          signature: mintSignature,
          blockhash: blockhash2,
          lastValidBlockHeight: lastValidBlockHeight2,
        },
        'confirmed'
      );

      console.log('✅ Tokens minted to user');
      console.log('✅ Transaction 2 signature:', mintSignature);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      mintAddress: mintPublicKey.toBase58(),
      name,
      symbol,
      description,
      prePurchaseAmount,
      signature,
      mintSignature,
      userTokenAccount: userTokenAccount?.toBase58(),
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error('Error creating token:', error);

    // Better error messages
    let errorMessage = error.message || 'Failed to create token';

    if (error.message?.includes('blockhash not found')) {
      errorMessage = 'Transaction expired. Please try again.';
    } else if (error.message?.includes('insufficient funds')) {
      errorMessage = 'Insufficient SOL in backend wallet. Please fund it.';
    } else if (error.message?.includes('Transaction too large')) {
      errorMessage = 'Transaction too large. Use shorter name/symbol.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
