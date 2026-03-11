import { NextResponse } from 'next/server'
import { getInventory } from '@/lib/game'
import { handleRouteError } from '@/lib/route'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params
    return NextResponse.json(await getInventory(username))
  } catch (error) {
    return handleRouteError(error)
  }
}
