import englishWords from 'an-array-of-english-words' with { type: 'json' }
import { Filter } from 'bad-words'

const englishWordSet = new Set(englishWords.map((word) => word.toLowerCase()))
const profanityFilter = new Filter()
const blockedWords = new Set(['slur', 'nazi', 'hitler'])

export const normalizeWord = (value: string) => value.trim().toLowerCase()

export const validateCraftWord = (value: string) => {
  const normalized = normalizeWord(value)

  if (!/^[a-z]+$/i.test(value.trim())) {
    return { ok: false as const, error: 'Use one alphabetic word only.' }
  }

  if (!englishWordSet.has(normalized)) {
    return { ok: false as const, error: 'That word is not in the crafting lexicon.' }
  }

  if (profanityFilter.isProfane(normalized) || blockedWords.has(normalized)) {
    return { ok: false as const, error: 'That word is blocked from crafting.' }
  }

  return { ok: true as const, normalized }
}
