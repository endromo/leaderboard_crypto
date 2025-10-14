import { useState, useEffect } from 'react';
import Leaderboard from '../components/Leaderboard';

export default function Home() {
  return (
    <div>
      <h1>Leaderboard PNL</h1>
      <Leaderboard />
    </div>
  );
}