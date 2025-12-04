// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';

const RUST_GRAPHQL_API = process.env.RUST_GRAPHQL_API || 'http://localhost:8080/graphql';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') || '100';
  const offset = searchParams.get('offset') || '0';
  const sortBy = searchParams.get('sortBy') || 'roi';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const query = `
    query GetLeaderboard($limit: Int!, $offset: Int!, $sortBy: String, $sortOrder: String) {
      leaderboard(filter: {
        limit: $limit,
        offset: $offset,
        sortBy: $sortBy,
        sortOrder: $sortOrder
      }) {
        rank
        traderWallet
        accountValue
        pnl
        roi
        volume
        lastUpdated
      }
    }
  `;

  try {
    const response = await fetch(RUST_GRAPHQL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { limit: parseInt(limit), offset: parseInt(offset), sortBy, sortOrder }
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}