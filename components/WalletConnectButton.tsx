import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletConnectButton() {
  return (
    <div className="flex justify-end mb-8">
      <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-colors" />
    </div>
  );
}
