// app/components/LeaderboardTable.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';

interface LeaderboardEntry {
    rank: number;
    traderWallet: string;
    accountValue: string;
    pnl: string;
    roi: string;
    volume: string;
    lastUpdated: string;
}

export default function LeaderboardTable() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'roi' | 'pnl' | 'volume'>('roi');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchLeaderboard();
    }, [sortBy, sortOrder]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        const res = await fetch(
            `/api/leaderboard?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=100`
        );
        const result = await res.json();
        setData(result.data?.leaderboard || []);
        setLoading(false);
    };

    const formatCurrency = (value: string) => {
        const num = parseFloat(value);
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    const formatWallet = (wallet: string) =>
        `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trader Wallet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button onClick={() => setSortBy('accountValue')}>
                                Account Value
                            </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                                onClick={() => {
                                    setSortBy('pnl');
                                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                }}
                                className="flex items-center"
                            >
                                PNL
                                {sortBy === 'pnl' && (
                                    <span>{sortOrder === 'desc' ? ' ↓' : ' ↑'}</span>
                                )}
                            </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                                onClick={() => {
                                    setSortBy('roi');
                                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                }}
                                className="flex items-center"
                            >
                                ROI
                                {sortBy === 'roi' && (
                                    <span>{sortOrder === 'desc' ? ' ↓' : ' ↑'}</span>
                                )}
                            </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button onClick={() => setSortBy('volume')}>
                                Volume
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center">
                                Loading...
                            </td>
                        </tr>
                    ) : (
                        data.map((entry) => (
                            <tr key={entry.rank} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${entry.rank <= 3
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        #{entry.rank}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                                    {formatWallet(entry.traderWallet)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                    {formatCurrency(entry.accountValue)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(entry.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatCurrency(entry.pnl)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${parseFloat(entry.roi) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {parseFloat(entry.roi).toFixed(2)}%
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {formatCurrency(entry.volume)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}