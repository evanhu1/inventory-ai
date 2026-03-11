import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { upsertProfile } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    return NextResponse.json(await upsertProfile(userId, await request.json()))
  } catch (error) {
    return handleRouteError(error)
  }
}
