import dotenv from 'dotenv'

dotenv.config()

function required(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: required('DATABASE_URL'),
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  googleGenAiApiKey: process.env.GOOGLE_GENAI_API_KEY ?? '',
  publicAppUrl: process.env.PUBLIC_APP_URL ?? 'http://localhost:8787',
}

export const integrations = {
  clerkEnabled: Boolean(config.clerkSecretKey),
  anthropicEnabled: Boolean(config.anthropicApiKey),
  googleGenAiEnabled: Boolean(config.googleGenAiApiKey),
}
