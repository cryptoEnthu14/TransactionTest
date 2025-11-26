/**
 * Keypair Generator for Solana Token Creator
 *
 * This script generates a new Solana keypair and outputs it in base58 format
 * which can be used in the .env.local file for the BACKEND_KEYPAIR_SECRET variable.
 *
 * Usage:
 *   node generate-keypair.js
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

console.log('Generating new Solana keypair...\n');

const keypair = Keypair.generate();
const secretKey = bs58.encode(keypair.secretKey);
const publicKey = keypair.publicKey.toBase58();

console.log('✅ Keypair generated successfully!\n');
console.log('Public Key (Wallet Address):');
console.log(publicKey);
console.log('\nSecret Key (Base58 - use this in .env.local):');
console.log(secretKey);
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. NEVER share your secret key with anyone');
console.log('2. NEVER commit your secret key to git');
console.log('3. Store your secret key securely (password manager, secrets vault, etc.)');
console.log('4. Use different keypairs for devnet and mainnet');
console.log('\n📝 Next steps:');
console.log('1. Copy the Secret Key above');
console.log('2. Add it to your .env.local file as: BACKEND_KEYPAIR_SECRET=<secret_key>');
console.log('3. Fund this wallet with SOL:');
console.log(`   - Devnet: solana airdrop 2 ${publicKey} --url devnet`);
console.log(`   - Or visit: https://faucet.solana.com/`);
console.log('   - Mainnet: Send SOL from another wallet\n');
