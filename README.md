# Solana Token Creator

A full-stack web application for creating SPL tokens on the Solana blockchain with a simple, user-friendly interface.

## Features

- 🎨 Modern, responsive UI built with Next.js and Tailwind CSS
- 👛 Phantom wallet integration for seamless authentication
- 🪙 Create custom SPL tokens with metadata
- 💰 Pre-purchase tokens during creation
- 🔐 Backend maintains mint authority via secure keypair
- 🌐 Support for both Devnet (testing) and Mainnet
- ✅ Full TypeScript support for type safety
- 📊 View created tokens on Solana Explorer

## Technology Stack

### Frontend
- **Next.js** - React framework for full-stack development
- **React** - UI component library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Phantom Wallet** - Solana wallet adapter

### Backend
- **Next.js API Routes** - Serverless backend endpoints
- **Node.js** - JavaScript runtime

### Blockchain
- **Solana Web3.js** - Solana blockchain JavaScript library
- **SPL Token Program** - Standard token implementation
- **Metaplex Token Metadata** - Token metadata standard
- **@solana/wallet-adapter** - Wallet integration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or higher
- npm or yarn
- Phantom Wallet browser extension
- Solana CLI (optional, for keypair generation)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/TransactionTest.git
   cd TransactionTest
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Configure your backend keypair:**

   You need to generate a keypair that will serve as the mint authority for all tokens created through this application.

   **Option A: Using Solana CLI (Recommended)**
   ```bash
   # Generate new keypair
   solana-keygen new --outfile backend-keypair.json --no-bip39-passphrase

   # Convert to base58 format
   # On Linux/Mac:
   cat backend-keypair.json | jq -r '.' | tr -d '[],' | xargs | python3 -c "import sys; import base58; print(base58.b58encode(bytes([int(x) for x in sys.stdin.read().split()])).decode())"
   ```

   **Option B: Using Node.js**
   ```javascript
   // generate-keypair.js
   const { Keypair } = require('@solana/web3.js');
   const bs58 = require('bs58');

   const keypair = Keypair.generate();
   const secretKey = bs58.encode(keypair.secretKey);
   console.log('Public Key:', keypair.publicKey.toBase58());
   console.log('Secret Key (base58):', secretKey);
   ```

5. **Update .env.local with your configuration:**
   ```env
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   BACKEND_KEYPAIR_SECRET=your_base58_encoded_secret_key_here
   ```

6. **Fund your backend wallet (for Devnet):**
   ```bash
   # Get your backend wallet address from the public key
   solana airdrop 2 <YOUR_BACKEND_WALLET_ADDRESS> --url devnet

   # Or use the Solana Faucet:
   # Visit https://faucet.solana.com/
   ```

## Running the Application

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Connect your Phantom wallet:**
   - Click "Select Wallet" button
   - Choose Phantom
   - Approve the connection
   - **IMPORTANT:** Make sure Phantom is set to the correct network (Devnet for testing)

## Testing the Application

### Phase 1: Environment Setup

1. **Verify Phantom Wallet Setup:**
   - Install Phantom Wallet extension
   - Create or import a wallet
   - Switch to Devnet:
     - Click Settings (gear icon)
     - Click "Developer Settings"
     - Enable "Testnet Mode"
     - Select "Devnet" from the network dropdown
   - Get Devnet SOL from https://faucet.solana.com/

2. **Verify Backend Wallet:**
   - Ensure your backend wallet has at least 0.5 SOL on Devnet
   - Check balance: `solana balance <ADDRESS> --url devnet`

### Phase 2: Create Your First Token

1. **Basic Token Creation:**
   - Open the application
   - Connect Phantom wallet
   - Fill in the form:
     - **Name:** "Test Token"
     - **Ticker:** "TEST"
     - **Description:** "My first test token on Solana"
     - **Pre-purchase Amount:** 1000
   - Click "Create Token"
   - Approve the transaction in Phantom (if prompted)
   - Wait for confirmation (usually 1-2 seconds)

2. **Verify Token Creation:**
   - Check the success message
   - Click "View on Solana Explorer"
   - Verify the token details on explorer
   - Check your Phantom wallet - you should see 1000 TEST tokens

### Phase 3: Advanced Testing

Test different scenarios to ensure the application works correctly:

#### Test Case 1: Token without Pre-purchase
```
Name: No Mint Token
Ticker: NOMINT
Description: Token created without initial minting
Pre-purchase Amount: 0
Expected: Token created but no tokens in wallet
```

#### Test Case 2: Large Pre-purchase Amount
```
Name: Big Token
Ticker: BIG
Description: Testing large amounts
Pre-purchase Amount: 1000000
Expected: 1,000,000 tokens minted to wallet
```

#### Test Case 3: Multiple Tokens
```
Create 3 different tokens with the same wallet
Expected: All tokens appear in Phantom wallet
```

#### Test Case 4: Special Characters
```
Name: Token with Émojis 🚀
Ticker: EMOJI
Description: Testing special characters: !@#$%
Expected: Should handle gracefully
```

#### Test Case 5: Network Switch
```
1. Create token on Devnet
2. Switch Phantom to Mainnet
3. Switch back to Devnet
4. Verify token still visible
```

### Phase 4: Verification Checklist

Use Solana Explorer to verify:

- ✅ **Mint Account:**
  - Search for mint address on explorer
  - Verify decimals = 9
  - Verify mint authority = your backend wallet
  - Verify freeze authority = your backend wallet

- ✅ **Metadata Account:**
  - Check token name matches
  - Check symbol matches
  - Verify metadata is readable

- ✅ **Token Account:**
  - Verify user's associated token account exists
  - Check balance matches pre-purchase amount
  - Verify owner is user's wallet

- ✅ **Transaction:**
  - View transaction details
  - Check all instructions executed successfully
  - Verify no errors

### Phase 5: Error Handling Tests

1. **Insufficient SOL:**
   - Remove SOL from backend wallet
   - Try creating token
   - Expected: Error message about insufficient funds

2. **Invalid Input:**
   - Try empty name/ticker
   - Try negative pre-purchase amount
   - Try ticker > 10 characters
   - Expected: Validation errors

3. **Wallet Not Connected:**
   - Disconnect wallet
   - Try to create token
   - Expected: "Please connect your wallet" message

4. **Network Mismatch:**
   - Backend on Devnet, Phantom on Mainnet
   - Expected: Transaction may fail or go to wrong network

## Deployment to Production (Mainnet)

When ready to deploy to Mainnet:

1. **Update environment variables:**
   ```env
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
   # Optional: Use a dedicated RPC provider
   NEXT_PUBLIC_RPC_ENDPOINT=https://your-rpc-provider.com
   ```

2. **Generate new keypair for production:**
   - Create a new keypair for mainnet
   - Fund it with SOL for transaction fees
   - NEVER reuse your devnet keypair on mainnet

3. **Use a dedicated RPC provider:**
   Consider using:
   - [Helius](https://helius.dev/)
   - [QuickNode](https://www.quicknode.com/)
   - [Alchemy](https://www.alchemy.com/)

4. **Security considerations:**
   - Store backend keypair in secure vault (AWS Secrets Manager, etc.)
   - Implement rate limiting
   - Add authentication/authorization
   - Monitor for suspicious activity
   - Consider implementing a fee structure

## Cost Breakdown

Approximate costs per token creation on Mainnet (at ~$200/SOL):

- Mint account creation: ~0.00144 SOL ($0.29)
- Metadata account: ~0.0057 SOL ($1.14)
- Associated token account: ~0.00203 SOL ($0.41)
- Transaction fees: ~0.00001 SOL ($0.002)
- **Total: ~0.0092 SOL (~$1.84 per token)**

On Devnet, all costs are free (using airdropped SOL).

## Project Structure

```
TransactionTest/
├── components/
│   ├── TokenCreationForm.tsx    # Form for creating tokens
│   ├── TokenDisplay.tsx          # Display created token info
│   └── WalletConnectButton.tsx   # Wallet connection UI
├── lib/
│   └── constants.ts              # Network & configuration constants
├── pages/
│   ├── api/
│   │   └── create-token.ts       # Backend API for token creation
│   ├── _app.tsx                  # App wrapper with wallet provider
│   └── index.tsx                 # Main landing page
├── styles/
│   └── globals.css               # Global styles with Tailwind
├── .env.local.example            # Environment variables template
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── next.config.js                # Next.js configuration
```

## Architecture

### Flow Diagram

```
User Browser                 Backend API               Solana Blockchain
     │                            │                           │
     ├──── Connect Wallet ────────┤                           │
     │                            │                           │
     ├──── Fill Form ─────────────┤                           │
     │                            │                           │
     ├──── Submit Form ───────────>                           │
     │                            │                           │
     │                            ├──── Create Mint ─────────>│
     │                            │                           │
     │                            ├──── Create Metadata ─────>│
     │                            │                           │
     │                            ├──── Create Token Acct ───>│
     │                            │                           │
     │                            ├──── Mint Tokens ─────────>│
     │                            │                           │
     │                            │<──── Confirmation ────────┤
     │                            │                           │
     │<──── Token Data ───────────┤                           │
     │                            │                           │
     └──── Display Token ─────────┘                           │
```

## Troubleshooting

### Common Issues

1. **"Failed to create token" error:**
   - Check backend wallet has sufficient SOL
   - Verify network settings match (both Phantom and .env.local)
   - Check backend keypair is valid

2. **Wallet connection issues:**
   - Ensure Phantom extension is installed
   - Try refreshing the page
   - Check browser console for errors

3. **Token not showing in wallet:**
   - Wait a few seconds and refresh
   - Verify you're on the correct network
   - Check transaction on Solana Explorer

4. **Transaction timeout:**
   - Solana network may be congested
   - Try increasing the commitment level
   - Use a dedicated RPC endpoint

## Security Best Practices

- ✅ Never commit .env.local to git
- ✅ Never share your backend keypair
- ✅ Use different keypairs for devnet and mainnet
- ✅ Implement rate limiting in production
- ✅ Monitor backend wallet balance
- ✅ Validate all user inputs
- ✅ Use secure RPC providers
- ✅ Consider implementing transaction signing on client side for enhanced security

## Future Enhancements

Potential features to add:
- [ ] Upload token logo/image
- [ ] Revoke/transfer mint authority
- [ ] Burn tokens
- [ ] View all created tokens
- [ ] Token creation history
- [ ] Multi-signature support
- [ ] Advanced metadata (royalties, collections)
- [ ] Integration with token listing platforms

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check Solana documentation: https://docs.solana.com
- Solana Stack Exchange: https://solana.stackexchange.com

## Acknowledgments

- Solana Foundation
- Metaplex Foundation
- Phantom Wallet team
- Next.js team

---

**Happy Token Creating! 🚀**