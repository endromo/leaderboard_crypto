// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  };

  return NextResponse.json(healthcheck, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}