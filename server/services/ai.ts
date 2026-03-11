import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { env } from '../env'

type CardCreative = {
  cardName: string
  flavorText: string
  traits: string[]
  imagePrompt: string
}

const anthropicClient = env.anthropicApiKey
  ? new Anthropic({ apiKey: env.anthropicApiKey })
  : null

const geminiClient = env.geminiApiKey
  ? new GoogleGenAI({ apiKey: env.geminiApiKey })
  : null

const paletteFromWord = (word: string) => {
  const seed = Array.from(word).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return [
    `hsl(${seed % 360} 85% 62%)`,
    `hsl(${(seed * 1.7) % 360} 72% 50%)`,
    `hsl(${(seed * 2.3) % 360} 90% 78%)`,
  ]
}

const svgPlaceholder = (word: string, shiny: boolean) => {
  const [a, b, c] = paletteFromWord(word)
  const border = shiny ? '#f9d66b' : '#f4efe6'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${a}" />
          <stop offset="60%" stop-color="${b}" />
          <stop offset="100%" stop-color="${c}" />
        </linearGradient>
      </defs>
      <rect width="768" height="1024" rx="42" fill="#120f19" />
      <rect x="24" y="24" width="720" height="976" rx="34" fill="url(#bg)" stroke="${border}" stroke-width="8" />
      <circle cx="630" cy="150" r="110" fill="rgba(255,255,255,0.12)" />
      <circle cx="180" cy="250" r="140" fill="rgba(255,255,255,0.12)" />
      <text x="58" y="128" fill="#fff7ef" font-family="Georgia, serif" font-size="42">Inventory.ai</text>
      <text x="58" y="876" fill="#fff7ef" font-family="Georgia, serif" font-size="112" font-weight="700">${word}</text>
      <text x="58" y="940" fill="#fff7ef" font-family="Arial, sans-serif" font-size="28">${shiny ? 'First Edition Shiny' : 'Field Edition'}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const extractText = (content: Anthropic.Messages.Message['content']) =>
  content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

const safeJsonParse = (value: string): CardCreative | null => {
  try {
    const parsed = JSON.parse(value) as CardCreative
    if (!parsed.cardName || !parsed.flavorText || !parsed.imagePrompt) {
      return null
    }

    return {
      cardName: parsed.cardName.trim(),
      flavorText: parsed.flavorText.trim(),
      imagePrompt: parsed.imagePrompt.trim(),
      traits: Array.isArray(parsed.traits)
        ? parsed.traits.map((trait) => String(trait).trim()).filter(Boolean).slice(0, 4)
        : [],
    }
  } catch {
    return null
  }
}

const fallbackCreative = (word: string, sourceType: 'craft' | 'fusion', ingredients: string[]) => ({
  cardName: word[0].toUpperCase() + word.slice(1),
  flavorText:
    sourceType === 'fusion'
      ? `${word[0].toUpperCase() + word.slice(1)} condenses the memory of ${ingredients.join(' + ')} into one impossible relic.`
      : `${word[0].toUpperCase() + word.slice(1)} appears the instant a collector dares to name it out loud.`,
  traits: [word.slice(0, 4), sourceType === 'fusion' ? 'fusion' : 'origin', word.length > 6 ? 'mythic' : 'nimble'].filter(Boolean),
  imagePrompt: `Create a luminous trading card illustration of ${word}, surreal, collectible card art, detailed, centered subject, ornate border, no readable text.`,
})

export const generateCardCreative = async (params: {
  word: string
  sourceType: 'craft' | 'fusion'
  ingredients: string[]
}) => {
  if (!anthropicClient) {
    return fallbackCreative(params.word, params.sourceType, params.ingredients)
  }

  try {
    const message = await anthropicClient.messages.create({
      model: env.anthropicModel,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are designing a collectible trading card.\nReturn strict JSON with keys cardName, flavorText, traits, imagePrompt.\nThe item word is "${params.word}".\nSource type: ${params.sourceType}.\nIngredients: ${params.ingredients.join(', ') || 'none'}.\nConstraints:\n- cardName should be exactly the item word with title casing.\n- flavorText must be 1 sentence, <= 24 words.\n- traits should be 2 to 4 short lowercase thematic tags.\n- imagePrompt must describe a single striking fantasy or sci-fi illustration for the card art.\n- no markdown, no prose outside JSON.`,
        },
      ],
    })

    const parsed = safeJsonParse(extractText(message.content))
    return parsed ?? fallbackCreative(params.word, params.sourceType, params.ingredients)
  } catch {
    return fallbackCreative(params.word, params.sourceType, params.ingredients)
  }
}

export const generateCardImage = async (prompt: string, word: string, shiny: boolean) => {
  if (!geminiClient) {
    return svgPlaceholder(word, shiny)
  }

  try {
    const interaction = await geminiClient.interactions.create({
      model: env.geminiImageModel,
      input: prompt,
      response_modalities: ['image'],
    })
    const image = (interaction.outputs ?? []).find(
      (output) => output.type === 'image',
    ) as { data?: string; mime_type?: string } | undefined
    if (image?.data) {
      return `data:${image.mime_type ?? 'image/png'};base64,${image.data}`
    }
  } catch {
    return svgPlaceholder(word, shiny)
  }

  return svgPlaceholder(word, shiny)
}
