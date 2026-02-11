import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SolanaMobileWalletAdapterWalletName, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { QRCodeCanvas } from 'qrcode.react';
import { encodeURL } from '@solana/pay';
import { Heart, ShieldCheck, Zap, Smartphone, Coins } from 'lucide-react';
import { Buffer } from 'buffer';

import '@solana/wallet-adapter-react-ui/styles.css';

const NETWORK = 'mainnet-beta';
const TREASURY_WALLET = new PublicKey('3id7PLHGphEzBEzobaBynsB5p9Ui1s15WWF24setZyea');
const SKR_TOKEN_MINT = new PublicKey('TokenkegQFEZ2Dxr1zk8JWVYj3G2yv2NNfGruvwi');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQFEZ2Dxr1zk8JWVYj3G2yv2NNfGruvwi');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const TipJarApp = () => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [isSeekerHolder, setIsSeekerHolder] = useState(false);
  const [isLifetimeActive, setIsLifetimeActive] = useState(false);
  const [tipAmount, setTipAmount] = useState('0.1');
  const [paymentStatus, setPaymentStatus] = useState<null | 'processing' | 'success' | 'error'>(null);

  const getAssociatedTokenAddress = (mint: PublicKey, owner: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  };

  const checkSeekerStatus = useCallback(async () => {
    if (!publicKey) return;
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: SKR_TOKEN_MINT,
      });
      setIsSeekerHolder(accounts.value.length > 0);
    } catch (e) {
      console.error("Error checking token ownership", e);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey && connected) {
      checkSeekerStatus();
    }
  }, [publicKey, connected, checkSeekerStatus]);

  const handlePayment = async (type: 'SOL' | 'SKR') => {
    if (!publicKey) return;
    setPaymentStatus('processing');

    try {
      const transaction = new Transaction();

      if (type === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: TREASURY_WALLET,
            lamports: 0.1 * LAMPORTS_PER_SOL,
          })
        );
      } else {
        const senderATA = getAssociatedTokenAddress(SKR_TOKEN_MINT, publicKey);
        const receiverATA = getAssociatedTokenAddress(SKR_TOKEN_MINT, TREASURY_WALLET);

        const data = Buffer.alloc(9);
        data.writeUInt8(3, 0);
        const skrAmount = BigInt(400 * 1_000_000_000);
        data.writeBigUInt64LE(skrAmount, 1);

        transaction.add(
          new TransactionInstruction({
            keys: [
              { pubkey: senderATA, isSigner: false, isWritable: true },
              { pubkey: receiverATA, isSigner: false, isWritable: true },
              { pubkey: publicKey, isSigner: true, isWritable: false },
            ],
            programId: TOKEN_PROGRAM_ID,
            data: data,
          })
        );
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'processed');
      setIsLifetimeActive(true);
      setPaymentStatus('success');
    } catch (e) {
      console.error("Payment failed", e);
      setPaymentStatus('error');
    }
  };

  const generateSolanaPayQR = () => {
    if (!publicKey) return null;
    const recipient = publicKey;
    const amount = parseFloat(tipAmount);
    const label = 'Tip Jar';
    const message = 'Thank you for your tip!';

    const url = encodeURL({ recipient, amount, label, message });
    return url.toString();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">
      <nav className="p-4 flex justify-between items-center border-b border-white/10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-xl">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SolTip Jar</span>
        </div>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-full !h-10 !text-sm" />
      </nav>

      <main className="max-w-md mx-auto p-6 pb-24 space-y-8">
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Tips for Creators.
          </h1>
          <p className="text-slate-400">Receive SOL & SKR instantly with a custom link and Solana Pay QR.</p>
        </section>

        {connected && (
          <div className={`p-4 rounded-2xl border ${isSeekerHolder ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10 bg-white/5'} transition-all`}>
            <div className="flex items-center gap-3">
              {isSeekerHolder ? (
                <ShieldCheck className="text-amber-500 w-6 h-6" />
              ) : (
                <Smartphone className="text-purple-500 w-6 h-6" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {isSeekerHolder ? 'Seeker / SKR Holder Verified' : 'Standard Account'}
                </p>
                <p className="text-xs text-slate-400 truncate w-48">
                  {publicKey.toBase58()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-6 shadow-2xl">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tip Amount</label>
            <input
              type="number"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-2xl font-mono focus:ring-2 ring-purple-500 outline-none transition-all"
            />
          </div>

          <div className="flex justify-center p-4 bg-white rounded-2xl">
            {generateSolanaPayQR() && (
               <QRCodeCanvas value={generateSolanaPayQR()!} size={200} />
            )}
          </div>
        </div>

        {!isLifetimeActive && !isSeekerHolder && (
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Lifetime Pro</h3>
                <p className="text-sm text-indigo-200">Unlock custom links & themes.</p>
              </div>
              <span className="bg-indigo-500 text-[10px] px-2 py-1 rounded-full font-bold">LIMITED</span>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handlePayment('SOL')}
                disabled={paymentStatus === 'processing'}
                className="w-full bg-white text-indigo-900 font-black py-3 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                Pay 0.1 SOL
              </button>
              <button
                onClick={() => handlePayment('SKR')}
                disabled={paymentStatus === 'processing'}
                className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-4" />
                Purchase
              </button>
            </div>

            {paymentStatus === 'processing' && <p className="text-center text-xs animate-pulse text-indigo-200">Processing payment...</p>}
            {paymentStatus === 'error' && <p className="text-center text-xs text-red-400">Payment failed. Try again.</p>}
          </div>
        )}

        {(isSeekerHolder || isLifetimeActive) && (
           <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6">
             <h3 className="font-bold text-amber-500 flex items-center gap-2">
               <ShieldCheck className="w-5 h-5" />
               Premium Access Active
             </h3>
             <ul className="text-sm mt-3 space-y-2 text-amber-200/80">
               <li>• 0% Platform Fees</li>
               <li>• Priority Listing Enabled</li>
               <li>• Custom .skr Domain Support</li>
             </ul>
           </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 p-4 flex justify-around">
        <button className="flex flex-col items-center gap-1 text-purple-500">
           <Zap className="w-6 h-6" />
           <span className="text-[10px] font-bold">Tips</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-500">
           <Smartphone className="w-6 h-6" />
           <span className="text-[10px] font-bold">Seeker</span>
        </button>
      </footer>
    </div>
  );
};

export const App = () => {
  const endpoint = useMemo(() => clusterApiUrl(NETWORK), []);
  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapterWalletName({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'SolTip Jar',
          uri: 'https://sovereign.app',
          icon: 'favicon.ico',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: NETWORK,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TipJarApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;
