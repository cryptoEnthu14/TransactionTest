import { EXPLORER_URL, NETWORK } from '@/lib/constants';

interface TokenDisplayProps {
  tokenData: {
    mintAddress: string;
    name: string;
    symbol: string;
    description?: string;
    prePurchaseAmount: number;
    signature: string;
    userTokenAccount?: string;
  };
}

export default function TokenDisplay({ tokenData }: TokenDisplayProps) {
  const explorerUrl = `${EXPLORER_URL}/address/${tokenData.mintAddress}?cluster=${NETWORK}`;
  const txExplorerUrl = `${EXPLORER_URL}/tx/${tokenData.signature}?cluster=${NETWORK}`;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-xl p-8 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Token Created Successfully! 🎉
        </h2>
      </div>

      <div className="space-y-4">
        {/* Token Name */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Token Name</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{tokenData.name}</p>
        </div>

        {/* Token Symbol */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Symbol</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{tokenData.symbol}</p>
        </div>

        {/* Description */}
        {tokenData.description && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
            <p className="text-gray-900 dark:text-white">{tokenData.description}</p>
          </div>
        )}

        {/* Mint Address */}
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mint Address</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-purple-600 dark:text-purple-400 break-all">
              {tokenData.mintAddress}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(tokenData.mintAddress)}
              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Pre-purchased Amount */}
        {tokenData.prePurchaseAmount > 0 && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Tokens Minted to Your Wallet
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {tokenData.prePurchaseAmount.toLocaleString()} {tokenData.symbol}
            </p>
          </div>
        )}

        {/* User Token Account */}
        {tokenData.userTokenAccount && (
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Your Token Account
            </p>
            <code className="text-sm text-gray-600 dark:text-gray-300 break-all">
              {tokenData.userTokenAccount}
            </code>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors duration-200"
          >
            View on Solana Explorer
          </a>
          <a
            href={txExplorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors duration-200"
          >
            View Transaction
          </a>
        </div>

        {/* Network Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Network:</span> {NETWORK.toUpperCase()}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {NETWORK === 'devnet' && 'This token was created on Solana Devnet for testing purposes.'}
            {NETWORK === 'mainnet-beta' && 'This token is live on Solana Mainnet!'}
          </p>
        </div>
      </div>
    </div>
  );
}
