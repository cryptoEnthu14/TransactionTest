import { useState } from 'react';
import Head from 'next/head';
import WalletConnectButton from '@/components/WalletConnectButton';
import TokenCreationForm from '@/components/TokenCreationForm';
import TokenDisplay from '@/components/TokenDisplay';

export default function Home() {
  const [createdToken, setCreatedToken] = useState<any>(null);

  const handleTokenCreated = (tokenData: any) => {
    setCreatedToken(tokenData);
  };

  const handleCreateAnother = () => {
    setCreatedToken(null);
  };

  return (
    <>
      <Head>
        <title>Solana Token Creator</title>
        <meta name="description" content="Create your own Solana SPL tokens" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Solana Token Creator
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Create your own SPL tokens on Solana blockchain in seconds
            </p>
          </div>

          {/* Wallet Connection */}
          <WalletConnectButton />

          {/* Main Content */}
          {!createdToken ? (
            <TokenCreationForm onTokenCreated={handleTokenCreated} />
          ) : (
            <div className="space-y-6">
              <TokenDisplay tokenData={createdToken} />
              <button
                onClick={handleCreateAnother}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Create Another Token
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              Built with Next.js, Solana Web3.js, and SPL Token Program
            </p>
            <p className="text-xs mt-2">
              Make sure you're on the correct network in your wallet settings
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
