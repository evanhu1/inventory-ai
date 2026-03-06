import 'dotenv/config'

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  port: toNumber(process.env.PORT, 8787),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? '',
  clerkPublishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_TEXT_MODEL ?? 'claude-sonnet-4-5-20250929',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image',
}

export const authEnabled = Boolean(env.clerkSecretKey && env.clerkPublishableKey)
