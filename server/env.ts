import 'dotenv/config'

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const firstDefined = (...values: Array<string | undefined>) => values.find((value) => value && value.length > 0) ?? ''

export const env = {
  port: toNumber(process.env.PORT, 3000),
  appUrl:
    firstDefined(process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  databaseUrl: firstDefined(
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ),
  databaseUrlUnpooled: firstDefined(
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ),
  clerkPublishableKey: firstDefined(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    process.env.VITE_CLERK_PUBLISHABLE_KEY,
  ),
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_TEXT_MODEL ?? 'claude-sonnet-4-5-20250929',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image',
}

export const authEnabled = Boolean(env.clerkSecretKey && env.clerkPublishableKey)
