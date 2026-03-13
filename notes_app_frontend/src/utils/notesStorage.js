/**
 * Notes storage utility.
 * Uses localStorage as the persistence layer with safe parsing and reasonable defaults.
 */

/**
 * Generate a reasonably unique ID without external dependencies.
 * Uses crypto.randomUUID when available, otherwise falls back to time+random.
 */
function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const STORAGE_KEY = "retro-notes:v1";

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * Validate and normalize a raw note-like object from storage.
 * @param {any} raw
 * @returns {Note | null}
 */
function normalizeNote(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : null;
  if (!id) return null;

  const title = typeof raw.title === "string" ? raw.title : "";
  const body = typeof raw.body === "string" ? raw.body : "";

  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now();
  const updatedAt =
    typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : createdAt;

  return { id, title, body, createdAt, updatedAt };
}

/**
 * Read the raw storage value and safely parse.
 * @returns {any[]}
 */
function safeReadArray() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist notes array to localStorage.
 * @param {Note[]} notes
 */
function writeNotes(notes) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// PUBLIC_INTERFACE
export function loadNotes() {
  /** Load notes from localStorage (safe parsing + normalization). Returns newest-first. */
  const rawArr = safeReadArray();
  const normalized = rawArr.map(normalizeNote).filter(Boolean);

  // Sort newest updatedAt first
  normalized.sort((a, b) => b.updatedAt - a.updatedAt);
  return normalized;
}

// PUBLIC_INTERFACE
export function saveNotes(notes) {
  /** Save notes array to localStorage (assumes notes already normalized). */
  writeNotes(notes);
}

// PUBLIC_INTERFACE
export function createNote({ title, body }) {
  /** Create a new note object with ID and timestamps. */
  const now = Date.now();
  return {
    id: generateId(),
    title: (title ?? "").toString(),
    body: (body ?? "").toString(),
    createdAt: now,
    updatedAt: now,
  };
}

// PUBLIC_INTERFACE
export function updateNote(existing, patch) {
  /** Return a new updated note object (immutable) with updatedAt changed. */
  const now = Date.now();
  return {
    ...existing,
    title:
      patch && Object.prototype.hasOwnProperty.call(patch, "title")
        ? (patch.title ?? "").toString()
        : existing.title,
    body:
      patch && Object.prototype.hasOwnProperty.call(patch, "body")
        ? (patch.body ?? "").toString()
        : existing.body,
    updatedAt: now,
  };
}

// PUBLIC_INTERFACE
export function formatDateTime(ts) {
  /** Format timestamp into a short, readable local string. */
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

// PUBLIC_INTERFACE
export function getStorageKey() {
  /** Expose storage key for tests and debugging. */
  return STORAGE_KEY;
}
