// app/components/TraderModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface TraderModalProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TraderDetail {
  wallet: string;
  totalTrades: number;
  winRate: number;
  avgTradeSize: string;
  favoritePair: string;
  joinedDate: string;
  totalVolume: string;
  maxDrawdown: number;
}

export default function TraderModal({ walletAddress, isOpen, onClose }: TraderModalProps) {
  const [traderDetail, setTraderDetail] = useState<TraderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchTraderDetail();
    }
  }, [isOpen, walletAddress]);

  const fetchTraderDetail = async () => {
    setIsLoading(true);
    try {
      // Simulasi fetch data
      setTimeout(() => {
        setTraderDetail({
          wallet: walletAddress,
          totalTrades: 1247,
          winRate: 68.5,
          avgTradeSize: '$45,250',
          favoritePair: 'ETH/USDC',
          joinedDate: '2023-06-15',
          totalVolume: '$45.2M',
          maxDrawdown: 12.4,
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching trader detail:', error);
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatWallet = (wallet: string) => 
    `${wallet.slice(0, 8)}...${wallet.slice(-8)}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Trader Details</h2>
              <div className="flex items-center gap-2 mt-2">
                <code className="bg-gray-100 px-3 py-1 rounded-lg font-mono">
                  {formatWallet(walletAddress)}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && (
                  <span className="text-sm text-green-600">Copied!</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : traderDetail ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Total Trades</p>
                  <p className="text-2xl font-bold text-gray-900">{traderDetail.totalTrades.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Win Rate</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-green-600">{traderDetail.winRate}%</p>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Avg. Trade</p>
                  <p className="text-2xl font-bold text-gray-900">{traderDetail.avgTradeSize}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Max Drawdown</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-red-600">{traderDetail.maxDrawdown}%</p>
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Trading Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Favorite Trading Pair</p>
                      <p className="font-medium">{traderDetail.favoritePair}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Volume</p>
                      <p className="font-medium">{traderDetail.totalVolume}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Joined Date</p>
                      <p className="font-medium">{traderDetail.joinedDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Activity Level</p>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(traderDetail.winRate, 100)}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{traderDetail.winRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Trades */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {['ETH Buy $45K', 'BTC Sell $120K', 'SOL Buy $25K', 'AVAX Sell $18K'].map((trade, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            trade.includes('Buy') ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span>{trade}</span>
                        </div>
                        <span className="text-sm text-gray-500">2 hours ago</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">External Links</h3>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://etherscan.io/address/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Etherscan
                  </a>
                  <a
                    href={`https://debank.com/profile/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on DeBank
                  </a>
                  <a
                    href={`https://zapper.fi/account/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Zapper
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No data available for this trader</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}