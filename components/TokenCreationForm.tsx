import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { MAX_PREPURCHASE_AMOUNT } from '@/lib/constants';

interface TokenCreationFormProps {
  onTokenCreated: (tokenData: any) => void;
}

export default function TokenCreationForm({ onTokenCreated }: TokenCreationFormProps) {
  const { publicKey, connected } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    description: '',
    prePurchaseAmount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      setError('Token name is required');
      return;
    }
    if (!formData.ticker.trim()) {
      setError('Token ticker is required');
      return;
    }
    if (formData.ticker.length > 10) {
      setError('Ticker symbol must be 10 characters or less');
      return;
    }

    const prePurchase = parseFloat(formData.prePurchaseAmount || '0');
    if (isNaN(prePurchase) || prePurchase < 0) {
      setError('Pre-purchase amount must be a valid positive number');
      return;
    }
    if (prePurchase > MAX_PREPURCHASE_AMOUNT) {
      setError(`Pre-purchase amount cannot exceed ${MAX_PREPURCHASE_AMOUNT.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          symbol: formData.ticker.trim().toUpperCase(),
          description: formData.description.trim() || undefined,
          prePurchaseAmount: prePurchase,
          userWallet: publicKey.toBase58(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create token');
      }

      // Reset form
      setFormData({
        name: '',
        ticker: '',
        description: '',
        prePurchaseAmount: '',
      });

      // Pass token data to parent
      onTokenCreated(data);
    } catch (err: any) {
      console.error('Error creating token:', err);
      setError(err.message || 'Failed to create token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Create Your Token</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Token Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., My Awesome Token"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={loading}
            required
          />
        </div>

        {/* Token Ticker */}
        <div>
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Ticker *
          </label>
          <input
            type="text"
            id="ticker"
            name="ticker"
            value={formData.ticker}
            onChange={handleChange}
            placeholder="e.g., MAT"
            maxLength={10}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white uppercase"
            disabled={loading}
            required
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Max 10 characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell us about your token..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            disabled={loading}
          />
        </div>

        {/* Pre-purchase Amount */}
        <div>
          <label htmlFor="prePurchaseAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pre-purchase Amount
          </label>
          <input
            type="number"
            id="prePurchaseAmount"
            name="prePurchaseAmount"
            value={formData.prePurchaseAmount}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Number of tokens to mint to your wallet (0 = create without minting)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !connected}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Token...' : 'Create Token'}
        </button>

        {!connected && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Please connect your wallet to create a token
          </p>
        )}
      </form>
    </div>
  );
}
