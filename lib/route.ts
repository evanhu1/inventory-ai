import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError } from './errors'

export function handleRouteError(error: unknown) {
  console.error(error)

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Internal server error.' },
    { status: 500 },
  )
}
