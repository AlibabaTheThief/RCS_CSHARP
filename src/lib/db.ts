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
  choiceMode: true,
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

/**
 * Load/merge the bundled seed. On first launch it seeds everything; on later
 * launches it refreshes static card/deck *content* (so fixes and new fields
 * reach existing installs) and adds any brand-new cards/decks — all without
 * touching the user's scheduling state or their own "Phrases for Dad".
 */
export async function ensureSeeded(seed: SeedFile): Promise<void> {
  const settings = await getSettings()
  const db = await getDB()
  const now = Date.now()

  const knownCardIds = new Set(await db.getAllKeys('cards'))
  const knownDeckIds = new Set((await db.getAllKeys('decks')).map(String))

  const tx = db.transaction(['cards', 'states', 'decks'], 'readwrite')

  for (const deck of seed.decks) {
    if (knownDeckIds.has(deck.id)) {
      // Refresh metadata but preserve the user's enabled choice.
      const current = (await tx.objectStore('decks').get(deck.id)) as StoredDeck | undefined
      await tx.objectStore('decks').put({ ...deck, enabled: current?.enabled ?? deck.enabledByDefault })
    } else {
      await tx.objectStore('decks').put({ ...deck, enabled: deck.enabledByDefault })
    }
  }

  for (const card of seed.cards) {
    // Always refresh content; only create a fresh state for brand-new cards.
    await tx.objectStore('cards').put(card)
    if (!knownCardIds.has(card.id)) {
      const state = newCardState(card.id, card.deckId, now)
      state.introduced = false // queue introduces it gradually
      await tx.objectStore('states').put(state)
    }
  }
  await tx.done

  if (!settings.seeded) await saveSettings({ ...settings, seeded: true })
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

export async function getAllCards(): Promise<SeedCard[]> {
  const db = await getDB()
  return db.getAll('cards')
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

/** Best streak ever reached, persisted in meta. */
export async function getBestStreak(): Promise<number> {
  const db = await getDB()
  return ((await db.get('meta', 'bestStreak')) as number | undefined) ?? 0
}

/** Record a new streak high-water mark; returns the (possibly updated) best. */
export async function updateBestStreak(current: number): Promise<number> {
  const db = await getDB()
  const best = await getBestStreak()
  if (current > best) {
    await db.put('meta', current, 'bestStreak')
    return current
  }
  return best
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

// ---------------------------------------------------------------------------
// Durability: persistent storage + backup/restore
// ---------------------------------------------------------------------------

/**
 * Ask the browser to make this origin's storage persistent, so the OS won't
 * silently evict the user's progress under storage pressure. Safe to call on
 * every launch — it's a no-op once granted. Returns the resulting state.
 */
export async function requestPersistentStorage(): Promise<'persisted' | 'prompt' | 'unsupported'> {
  if (!navigator.storage?.persist) return 'unsupported'
  try {
    if (await navigator.storage.persisted?.()) return 'persisted'
    return (await navigator.storage.persist()) ? 'persisted' : 'prompt'
  } catch {
    return 'unsupported'
  }
}

export const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'azeri-for-dad'
  backupVersion: number
  exportedAt: number
  cards: SeedCard[]
  states: CardState[]
  decks: StoredDeck[]
  reviews: ReviewLog[]
  meta: { key: string; value: unknown }[]
}

/** Serialize the entire database into a portable backup object. */
export async function exportData(): Promise<BackupFile> {
  const db = await getDB()
  const [cards, states, decks, reviews] = await Promise.all([
    db.getAll('cards'),
    db.getAll('states'),
    db.getAll('decks'),
    db.getAll('reviews'),
  ])
  // The meta store is keyed externally, so capture key/value pairs explicitly.
  const metaKeys = await db.getAllKeys('meta')
  const meta = await Promise.all(
    metaKeys.map(async (key) => ({ key: String(key), value: await db.get('meta', key) })),
  )
  return {
    app: 'azeri-for-dad',
    backupVersion: BACKUP_VERSION,
    exportedAt: Date.now(),
    cards,
    states,
    decks,
    reviews,
    meta,
  }
}

/** Validate a parsed object as an Azeri-for-Dad backup. Throws if invalid. */
export function assertValidBackup(data: unknown): asserts data is BackupFile {
  const b = data as Partial<BackupFile>
  if (!b || b.app !== 'azeri-for-dad') throw new Error('Not an Azeri for Dad backup file.')
  if (typeof b.backupVersion !== 'number' || b.backupVersion > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.')
  }
  for (const key of ['cards', 'states', 'decks', 'reviews', 'meta'] as const) {
    if (!Array.isArray(b[key])) throw new Error(`Backup is missing "${key}".`)
  }
}

/**
 * Replace all data with the contents of a validated backup. Validation happens
 * before anything is cleared, so a bad file never destroys existing data.
 */
export async function importData(data: unknown): Promise<void> {
  assertValidBackup(data)
  const db = await getDB()
  const tx = db.transaction(['cards', 'states', 'decks', 'reviews', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('states').clear(),
    tx.objectStore('decks').clear(),
    tx.objectStore('reviews').clear(),
    tx.objectStore('meta').clear(),
  ])
  for (const c of data.cards) await tx.objectStore('cards').put(c)
  for (const s of data.states) await tx.objectStore('states').put(s)
  for (const d of data.decks) await tx.objectStore('decks').put(d)
  for (const r of data.reviews) await tx.objectStore('reviews').put(r)
  for (const m of data.meta) await tx.objectStore('meta').put(m.value, m.key)
  await tx.done
}
