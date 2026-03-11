import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI, Modality } from '@google/genai'
import words from 'an-array-of-english-words/index.json' with { type: 'json' }
import { Filter } from 'bad-words'
import { randomUUID } from 'node:crypto'
import { config, integrations } from '../config'

const filter = new Filter()
const lexicon = new Set((words as string[]).map((word) => word.toLowerCase()))
const anthropic = integrations.anthropicEnabled ? new Anthropic({ apiKey: config.anthropicApiKey }) : null
const genAi = integrations.googleGenAiEnabled ? new GoogleGenAI({ apiKey: config.googleGenAiApiKey }) : null

export type GeneratedCardContent = {
  id: string
  flavorText: string
  tags: string[]
  artPrompt: string
  imageUrl: string
  basePower: number
}

type WordValidation =
  | { ok: true; normalized: string }
  | { ok: false; normalized: string; reason: string }

function normalizeWord(word: string) {
  return word.trim().toLowerCase()
}

export function validateSingleWord(input: string): WordValidation {
  const normalized = normalizeWord(input)
  if (!/^[a-z]+$/.test(normalized)) {
    return { ok: false, normalized, reason: 'Use one alphabetic English word.' }
  }

  if (filter.isProfane(normalized)) {
    return { ok: false, normalized, reason: 'That word is blocked.' }
  }

  if (!lexicon.has(normalized)) {
    return { ok: false, normalized, reason: 'That word is not in the allowed dictionary.' }
  }

  return { ok: true, normalized }
}

function fallbackTags(word: string) {
  const bucket = [
    'arcane',
    'relic',
    'wild',
    'urban',
    'celestial',
    'feral',
    'mythic',
    'mechanical',
  ]
  const primary = bucket[word.length % bucket.length] ?? 'arcane'
  const initial = word[0] ?? 'x'

  return [primary, `${initial}-sigil`, word.length > 6 ? 'rare-longform' : 'quickdraw']
}

function svgDataUrl(word: string, shiny: boolean, tags: string[]) {
  const border = shiny ? '#f8d66d' : '#f47c48'
  const fill = shiny ? '#2d1639' : '#162336'
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024">
    <defs>
      <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stop-color="${fill}" />
        <stop offset="100%" stop-color="#0c1018" />
      </linearGradient>
    </defs>
    <rect width="768" height="1024" rx="48" fill="url(#bg)" />
    <rect x="24" y="24" width="720" height="976" rx="32" fill="none" stroke="${border}" stroke-width="12" />
    <text x="64" y="126" fill="#f8efe2" font-family="Georgia" font-size="44">Inventory.ai</text>
    <text x="64" y="250" fill="#f8efe2" font-family="Georgia" font-size="96">${word}</text>
    <text x="64" y="330" fill="#f4c69c" font-family="Arial" font-size="30">${tags.join(' • ')}</text>
    <circle cx="580" cy="420" r="120" fill="${border}" opacity="0.15" />
    <circle cx="470" cy="520" r="180" fill="${border}" opacity="0.08" />
    <text x="64" y="840" fill="#d7dfed" font-family="Arial" font-size="28">AI art unavailable, fallback sigil rendered locally.</text>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

async function generateText(word: string, ingredients: string[]) {
  if (!anthropic) {
    return {
      flavorText: `${(word[0] ?? 'r').toUpperCase()}${word.slice(1)} hums with a collector's pull and rewards anyone who knows where to play it.`,
      tags: fallbackTags(word),
      artPrompt: `A cinematic trading-card illustration of ${word}, collectible relic aesthetic, layered lighting, intricate iconography`,
      basePower: Math.min(20, 8 + word.length + ingredients.length * 2),
    }
  }

  const prompt = `Design metadata for a collectible game item.
Word: ${word}
Ingredients: ${ingredients.join(', ') || 'none'}
Return strict JSON with keys flavorText, tags, artPrompt, basePower.
tags must be an array of 3 short lowercase strings.
basePower must be an integer between 8 and 24.
flavorText should be one sentence.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 220,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')

  try {
    const parsed = JSON.parse(text) as {
      flavorText: string
      tags: string[]
      artPrompt: string
      basePower: number
    }
    return {
      flavorText: parsed.flavorText,
      tags: parsed.tags.slice(0, 3),
      artPrompt: parsed.artPrompt,
      basePower: Math.max(8, Math.min(24, Math.round(parsed.basePower))),
    }
  } catch {
    return {
      flavorText: `${word} slipped out of the archive carrying rumors of an unfinished prophecy.`,
      tags: fallbackTags(word),
      artPrompt: `Illustrated collectible card art of ${word}, luminous, painterly, premium card game`,
      basePower: Math.min(20, 8 + word.length + ingredients.length * 2),
    }
  }
}

async function generateImage(word: string, artPrompt: string, shiny: boolean, tags: string[]) {
  if (!genAi) {
    return svgDataUrl(word, shiny, tags)
  }

  const response = await genAi.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: artPrompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  })

  const candidates = response.candidates ?? []
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? []
    for (const part of parts) {
      const data = part.inlineData?.data
      const mimeType = part.inlineData?.mimeType
      if (data && mimeType?.startsWith('image/')) {
        return `data:${mimeType};base64,${data}`
      }
    }
  }

  return svgDataUrl(word, shiny, tags)
}

export async function buildCardContent(word: string, ingredients: string[] = [], shiny = false): Promise<GeneratedCardContent> {
  const generatedText = await generateText(word, ingredients)
  const imageUrl = await generateImage(word, generatedText.artPrompt, shiny, generatedText.tags)

  return {
    id: randomUUID(),
    ...generatedText,
    imageUrl,
  }
}
