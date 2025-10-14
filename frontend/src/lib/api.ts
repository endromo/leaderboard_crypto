export interface UserPnl {
  rank: number;
  wallet_address: string;
  pnl: number;
}

export const fetchLeaderboard = async (limit: number, page: number): Promise<UserPnl[]> => {
  const res = await fetch(`/api/leaderboard?limit=${limit}&page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
};