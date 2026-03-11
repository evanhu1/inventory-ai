import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getArena } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function GET() {
  try {
    const { userId } = await auth()
    return NextResponse.json(await getArena(userId))
  } catch (error) {
    return handleRouteError(error)
  }
}
