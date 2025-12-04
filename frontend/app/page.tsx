// app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Download,
  Users,
  Trophy,
  Clock,
  Activity
} from 'lucide-react';
import LeaderboardTable from '@/components/LeaderboardTable';
import TraderModal from '@/components/TraderModal';
import TimeframeSelector from '@/components/TimeframeSelector';

// Types
interface LeaderboardEntry {
  rank: number;
  traderWallet: string;
  accountValue: string;
  pnl: string;
  roi: string;
  volume: string;
  lastUpdated: string;
}

interface Stats {
  totalTraders: number;
  totalVolume: string;
  averageROI: number;
  topPerformer: string;
  totalPnl: string;
}

interface ChartData {
  name: string;
  value: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    totalTraders: 0,
    totalVolume: '0',
    averageROI: 0,
    topPerformer: '',
    totalPnl: '0'
  });
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null);
  const [showTraderModal, setShowTraderModal] = useState(false);
  const [performanceData, setPerformanceData] = useState<ChartData[]>([]);
  const [volumeByTime, setVolumeByTime] = useState<ChartData[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchLeaderboardData();
    fetchStats();
    setupWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [timeframe]);

  // Auto-refresh setiap 30 detik
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, timeframe]);

  // Setup WebSocket untuk real-time updates
  const setupWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'leaderboard_updated' || data.type === 'periodic_update') {
          setLeaderboardData(data.data || []);
          setLastUpdated(new Date().toLocaleTimeString());
        } else if (data.type === 'initial') {
          setLeaderboardData(data.data || []);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (connectionStatus !== 'connected') {
          setConnectionStatus('connecting');
          setupWebSocket();
        }
      }, 5000);
    };
    
    setWs(websocket);
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      const response = await fetch(
        `/api/leaderboard?timeframe=${timeframe}&limit=100`
      );
      const data = await response.json();
      
      if (data.data?.leaderboard) {
        setLeaderboardData(data.data.leaderboard);
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Update chart data
        updateChartData(data.data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateChartData = (data: LeaderboardEntry[]) => {
    // Prepare performance distribution data
    const performanceDistribution = [
      { name: 'High ROI (>50%)', value: data.filter(d => parseFloat(d.roi) > 50).length },
      { name: 'Medium ROI (10-50%)', value: data.filter(d => parseFloat(d.roi) >= 10 && parseFloat(d.roi) <= 50).length },
      { name: 'Low ROI (0-10%)', value: data.filter(d => parseFloat(d.roi) >= 0 && parseFloat(d.roi) < 10).length },
      { name: 'Negative ROI', value: data.filter(d => parseFloat(d.roi) < 0).length },
    ];
    
    // Prepare volume by time data (mock)
    const volumeData = [
      { name: '00:00', value: Math.random() * 1000000 },
      { name: '04:00', value: Math.random() * 1500000 },
      { name: '08:00', value: Math.random() * 2000000 },
      { name: '12:00', value: Math.random() * 2500000 },
      { name: '16:00', value: Math.random() * 2000000 },
      { name: '20:00', value: Math.random() * 1500000 },
    ];
    
    setPerformanceData(performanceDistribution);
    setVolumeByTime(volumeData);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const trader = leaderboardData.find(
        entry => entry.traderWallet.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (trader) {
        setSelectedTrader(trader.traderWallet);
        setShowTraderModal(true);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ['Rank', 'Wallet', 'Account Value', 'PNL', 'ROI', 'Volume', 'Last Updated'];
    const csvContent = [
      headers.join(','),
      ...leaderboardData.map(entry => [
        entry.rank,
        `"${entry.traderWallet}"`,
        entry.accountValue,
        entry.pnl,
        entry.roi,
        entry.volume,
        entry.lastUpdated
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatWallet = (wallet: string) => 
    `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Trading Leaderboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time ranking of top traders by performance
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                autoRefresh 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } transition-colors`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Traders</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTraders.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12.5% from last week</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Volume</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats.totalVolume)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+8.3% from last week</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg. ROI</p>
              <p className={`text-3xl font-bold ${
                stats.averageROI >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.averageROI.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-gray-500 text-sm">Top: {formatWallet(stats.topPerformer || 'N/A')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total P&L</p>
              <p className={`text-3xl font-bold ${
                parseFloat(stats.totalPnl) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.totalPnl)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center text-gray-500 text-sm">
              <Clock className="w-4 h-4 mr-1" />
              <span>Updated: {lastUpdated || 'Just now'}</span>
            </div>
            <button
              onClick={fetchLeaderboardData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Distribution</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <PieChart width={300} height={250}>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Volume by Time</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <BarChart width={500} height={250} data={volumeByTime}>
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top Traders</h2>
            <p className="text-gray-600">Ranked by ROI in the last {timeframe}</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wallet address..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
            
            {/* Timeframe Selector */}
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            
            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <LeaderboardTable 
              data={leaderboardData}
              onTraderClick={(wallet) => {
                setSelectedTrader(wallet);
                setShowTraderModal(true);
              }}
            />
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
          <div className="text-gray-600">
            Showing <span className="font-semibold">1-50</span> of{' '}
            <span className="font-semibold">{leaderboardData.length}</span> traders
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              1
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              2
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              3
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How Rankings Work</h4>
          <p className="text-blue-800 text-sm">
            Traders are ranked by ROI (Return on Investment) based on their trading performance
            in the selected timeframe. All calculations are updated in real-time.
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">Data Sources</h4>
          <p className="text-green-800 text-sm">
            Data is aggregated from multiple DEXs and trading platforms including
            Uniswap, Binance, and other major exchanges. Updated every minute.
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-2">API Access</h4>
          <p className="text-purple-800 text-sm">
            Access real-time leaderboard data via our GraphQL API. 
            Visit <a href="/docs" className="underline">/docs</a> for documentation.
          </p>
        </div>
      </div>

      {/* Trader Modal */}
      {showTraderModal && selectedTrader && (
        <TraderModal
          walletAddress={selectedTrader}
          isOpen={showTraderModal}
          onClose={() => {
            setShowTraderModal(false);
            setSelectedTrader(null);
          }}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p>© {new Date().getFullYear()} Trading Leaderboard. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <a href="/api-docs" className="hover:text-blue-600 transition-colors">API Docs</a>
            <a href="https://github.com/your-repo" className="hover:text-blue-600 transition-colors">GitHub</a>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>Data updates every minute. Last full refresh: {new Date().toLocaleString()}</p>
          <p className="mt-1">
            System Status: <span className={`font-semibold ${
              connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
            }`}>
              {connectionStatus.toUpperCase()}
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}