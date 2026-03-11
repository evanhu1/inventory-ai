import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { respondTrade } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    return NextResponse.json(await respondTrade(userId, Number(id), await request.json()))
  } catch (error) {
    return handleRouteError(error)
  }
}
