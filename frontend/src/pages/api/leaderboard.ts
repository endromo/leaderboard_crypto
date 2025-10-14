import { NextApiRequest, NextApiResponse } from 'next';

// Contoh data statis untuk API route
const leaderboardData = [
    { rank: 1, username: 'AgentAlpha', pnl: 1545.23 },
    { rank: 2, username: 'BotBeta', pnl: 987.55 },
    { rank: 3, username: 'TraderGamma', pnl: -123.40 },
    { rank: 4, username: 'ZuluBot', pnl: 55.00 },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Di sini Anda akan memanggil backend Rust/database
    res.status(200).json(leaderboardData);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
