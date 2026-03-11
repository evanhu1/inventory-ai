import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createTrade } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    return NextResponse.json(await createTrade(userId, await request.json()), { status: 201 })
  } catch (error) {
    return handleRouteError(error)
  }
}
