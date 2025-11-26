import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export default function WalletConnectButton() {
  return (
    <div className="flex justify-end mb-8">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
    </div>
  );
}
