import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function GET() {
  try {
    return NextResponse.json(await getLeaderboard())
  } catch (error) {
    return handleRouteError(error)
  }
}
