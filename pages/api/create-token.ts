import type { NextApiRequest, NextApiResponse } from 'next';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
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
  userTokenAccount?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

    if (symbol.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Symbol must be 10 characters or less',
      });
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

    // Build transaction
    const transaction = new Transaction();

    // 1. Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: backendKeypair.publicKey,
        newAccountPubkey: mintPublicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintPublicKey,
        decimals,
        backendKeypair.publicKey, // Mint authority
        backendKeypair.publicKey, // Freeze authority (optional, can be null)
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
      name: name,
      symbol: symbol,
      uri: '', // Can be replaced with actual metadata URI (e.g., Arweave, IPFS)
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    } satisfies DataV2Args;

    transaction.add(
      buildCreateMetadataAccountV3Instruction({
        metadataPda: metadataAddress,
        mint: mintPublicKey,
        mintAuthority: backendKeypair.publicKey,
        payer: backendKeypair.publicKey,
        updateAuthority: backendKeypair.publicKey,
        data: metadataData,
      })
    );

    let userTokenAccount: PublicKey | undefined;

    // 4. If prePurchaseAmount > 0, create user's token account and mint tokens
    if (prePurchaseAmount > 0) {
      // Get associated token account address
      userTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        userPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      // Create associated token account
      transaction.add(
        createAssociatedTokenAccountInstruction(
          backendKeypair.publicKey, // Payer
          userTokenAccount, // Associated token account
          userPublicKey, // Owner
          mintPublicKey, // Mint
          TOKEN_PROGRAM_ID
        )
      );

      // Mint tokens to user
      const amount = BigInt(prePurchaseAmount) * BigInt(10 ** decimals);
      transaction.add(
        createMintToInstruction(
          mintPublicKey,
          userTokenAccount,
          backendKeypair.publicKey, // Mint authority
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = backendKeypair.publicKey;

    // Sign transaction
    transaction.sign(backendKeypair, mintKeypair);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
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

    console.log('Token created successfully!');
    console.log('Mint address:', mintPublicKey.toBase58());
    console.log('Transaction signature:', signature);

    // Return success response
    return res.status(200).json({
      success: true,
      mintAddress: mintPublicKey.toBase58(),
      name,
      symbol,
      description,
      prePurchaseAmount,
      signature,
      userTokenAccount: userTokenAccount?.toBase58(),
    });
  } catch (error: any) {
    console.error('Error creating token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create token',
    });
  }
}
