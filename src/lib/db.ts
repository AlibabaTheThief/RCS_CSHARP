// IndexedDB layer for Azeri for Dad (offline-first persistence).
//
// Stores:
//   cards     — static + user-added card content (SeedCard shape, extendable)
//   states    — per-card SRS scheduling state (CardState)
//   decks     — deck metadata + enabled flag
//   reviews   — review history log
//   meta      — settings + small key/value bits
//
// Seed content is loaded from cards.seed.json on first launch only; afterwards
// the user's progress and their own "Phrases for Dad" live entirely on-device.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  CardState,
  Deck,
  ReviewLog,
  SeedCard,
  SeedFile,
  Settings,
} from './types'
import { newCardState } from './srs'

export interface StoredDeck extends Deck {
  enabled: boolean
}

interface AzeriDB extends DBSchema {
  cards: { key: string; value: SeedCard; indexes: { deckId: string } }
  states: { key: string; value: CardState; indexes: { due: number; deckId: string } }
  decks: { key: string; value: StoredDeck }
  reviews: { key: number; value: ReviewLog; indexes: { at: number } }
  meta: { key: string; value: unknown }
}

const DB_NAME = 'azeri-for-dad'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<AzeriDB>> | null = null

function getDB(): Promise<IDBPDatabase<AzeriDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AzeriDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const cards = db.createObjectStore('cards', { keyPath: 'id' })
        cards.createIndex('deckId', 'deckId')

        const states = db.createObjectStore('states', { keyPath: 'id' })
        states.createIndex('due', 'due')
        states.createIndex('deckId', 'deckId')

        db.createObjectStore('decks', { keyPath: 'id' })

        const reviews = db.createObjectStore('reviews', {
          keyPath: 'id',
          autoIncrement: true,
        })
        reviews.createIndex('at', 'at')

        db.createObjectStore('meta')
      },
    })
  }
  return dbPromise
}

export const DEFAULT_SETTINGS: Settings = {
  audioEnabled: true,
  dailyTargetMinutes: 15,
  newPerDay: 8,
  seeded: false,
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB()
  await db.put('meta', settings, 'settings')
}

/** Load the bundled seed into the DB if it has not been loaded yet. */
export async function ensureSeeded(seed: SeedFile): Promise<void> {
  const settings = await getSettings()
  if (settings.seeded) return

  const db = await getDB()
  const now = Date.now()
  const tx = db.transaction(['cards', 'states', 'decks'], 'readwrite')

  for (const deck of seed.decks) {
    await tx.objectStore('decks').put({ ...deck, enabled: deck.enabledByDefault })
  }
  for (const card of seed.cards) {
    await tx.objectStore('cards').put(card)
    // States start un-introduced; the daily queue introduces them gradually.
    const state = newCardState(card.id, card.deckId, now)
    state.introduced = false
    await tx.objectStore('states').put(state)
  }
  await tx.done

  await saveSettings({ ...settings, seeded: true })
}

export async function getDecks(): Promise<StoredDeck[]> {
  const db = await getDB()
  const decks = await db.getAll('decks')
  return decks.sort((a, b) => a.phase - b.phase || a.name.localeCompare(b.name))
}

export async function setDeckEnabled(deckId: string, enabled: boolean): Promise<void> {
  const db = await getDB()
  const deck = await db.get('decks', deckId)
  if (deck) await db.put('decks', { ...deck, enabled })
}

export async function getCard(id: string): Promise<SeedCard | undefined> {
  const db = await getDB()
  return db.get('cards', id)
}

export async function getCardsByDeck(deckId: string): Promise<SeedCard[]> {
  const db = await getDB()
  return db.getAllFromIndex('cards', 'deckId', deckId)
}

export async function getState(id: string): Promise<CardState | undefined> {
  const db = await getDB()
  return db.get('states', id)
}

export async function getAllStates(): Promise<CardState[]> {
  const db = await getDB()
  return db.getAll('states')
}

export async function putState(state: CardState): Promise<void> {
  const db = await getDB()
  await db.put('states', state)
}

export async function logReview(entry: ReviewLog): Promise<void> {
  const db = await getDB()
  await db.add('reviews', entry)
}

export async function getReviewsSince(since: number): Promise<ReviewLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('reviews', 'at', IDBKeyRange.lowerBound(since))
}

export async function getAllReviews(): Promise<ReviewLog[]> {
  const db = await getDB()
  return db.getAll('reviews')
}

/** Add a user-authored "Phrases for Dad" card. */
export async function addDadPhrase(az: string, en: string, note?: string): Promise<SeedCard> {
  const db = await getDB()
  const id = `dad-${Date.now()}-${Math.floor(performance.now())}`
  const card: SeedCard = {
    id,
    deckId: 'dad',
    type: 'dad',
    az: az.trim(),
    en: en.trim(),
    note: note?.trim() || undefined,
    tags: ['heart'],
    // User-added phrases have no pre-generated audio.
    hasAudio: false,
  }
  const now = Date.now()
  const tx = db.transaction(['cards', 'states'], 'readwrite')
  await tx.objectStore('cards').put(card)
  await tx.objectStore('states').put(newCardState(id, 'dad', now))
  await tx.done
  return card
}

/** Cards the user has flagged as "Talk to Dad" goals (kept in meta). */
export async function getDadGoals(): Promise<string[]> {
  const db = await getDB()
  return ((await db.get('meta', 'dadGoals')) as string[] | undefined) ?? []
}

export async function toggleDadGoal(cardId: string): Promise<string[]> {
  const db = await getDB()
  const goals = await getDadGoals()
  const next = goals.includes(cardId)
    ? goals.filter((g) => g !== cardId)
    : [...goals, cardId]
  await db.put('meta', next, 'dadGoals')
  return next
}

/** Wipe all progress and re-seed on next launch (Settings → Reset). */
export async function resetAll(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['cards', 'states', 'decks', 'reviews', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('states').clear(),
    tx.objectStore('decks').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done
}
