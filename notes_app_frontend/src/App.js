import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  createNote,
  formatDateTime,
  getStorageKey,
  loadNotes,
  saveNotes,
  updateNote,
} from "./utils/notesStorage";

const NOTE_BODY_MAX = 2000;

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState("light");

  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const [query, setQuery] = useState("");
  const [onlyWithText, setOnlyWithText] = useState(false);

  const [error, setError] = useState("");

  const titleInputRef = useRef(null);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load notes on mount
  useEffect(() => {
    const loaded = loadNotes();
    setNotes(loaded);
    // default selection: newest note, if any
    setSelectedId(loaded[0]?.id ?? null);
  }, []);

  // Persist notes whenever they change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedId) ?? null;
  }, [notes, selectedId]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (onlyWithText && !(n.title.trim() || n.body.trim())) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    });
  }, [notes, query, onlyWithText]);

  const remainingChars = NOTE_BODY_MAX - draftBody.length;

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle light/dark theme. */
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  function clearDraft() {
    setDraftTitle("");
    setDraftBody("");
    setSelectedId(null);
    setError("");
    // Focus the title for faster entry
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus?.();
    });
  }

  function startEdit(note) {
    setSelectedId(note.id);
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setError("");
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus?.();
    });
  }

  function validateDraft() {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title && !body) {
      return "Write a title or some text before saving.";
    }
    if (draftBody.length > NOTE_BODY_MAX) {
      return `Note is too long (max ${NOTE_BODY_MAX} characters).`;
    }
    return "";
  }

  function upsertNote() {
    const validation = validateDraft();
    if (validation) {
      setError(validation);
      return;
    }

    setError("");
    const title = draftTitle.trim();
    const body = draftBody.trim();

    if (selectedId) {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === selectedId);
        if (idx === -1) {
          // If selected note disappeared, treat as create.
          const created = createNote({ title, body });
          return [created, ...prev];
        }
        const updated = updateNote(prev[idx], { title, body });
        const next = [...prev];
        next[idx] = updated;
        // move updated note to top
        next.sort((a, b) => b.updatedAt - a.updatedAt);
        return next;
      });
    } else {
      const created = createNote({ title, body });
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
  }

  function deleteSelected() {
    if (!selectedId) return;
    const toDelete = notes.find((n) => n.id === selectedId);
    if (!toDelete) return;

    const ok = window.confirm(`Delete note "${toDelete.title || "Untitled"}"?`);
    if (!ok) return;

    setNotes((prev) => prev.filter((n) => n.id !== selectedId));
    clearDraft();
  }

  function onClickNote(note) {
    startEdit(note);
  }

  return (
    <div className="App">
      <header className="app-shell">
        <div className="topbar">
          <div className="brand">
            <div className="brand-badge" aria-hidden="true">
              RN
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Retro Notes</h1>
              <p className="brand-subtitle">
                Local-only • stored in <code>localStorage</code> (
                <span className="mono">{getStorageKey()}</span>)
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="btn btn-secondary"
              onClick={clearDraft}
              type="button"
            >
              New note
            </button>

            <button
              className="btn btn-ghost"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              type="button"
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>

        <main className="layout">
          <section className="panel panel-left" aria-label="Notes list">
            <div className="panel-header">
              <h2 className="panel-title">Your notes</h2>
              <div className="pill" aria-label="notes count">
                {filteredNotes.length}
              </div>
            </div>

            <div className="search">
              <label className="label" htmlFor="search">
                Search
              </label>
              <input
                id="search"
                className="input"
                placeholder="Find by title or text…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={onlyWithText}
                  onChange={(e) => setOnlyWithText(e.target.checked)}
                />
                Only notes with content
              </label>
            </div>

            <div className="note-list" role="list">
              {filteredNotes.length === 0 ? (
                <div className="empty">
                  <p className="empty-title">No matches</p>
                  <p className="empty-subtitle">
                    Try a different search, or create a new note.
                  </p>
                </div>
              ) : (
                filteredNotes.map((n) => {
                  const active = n.id === selectedId;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`note-card ${active ? "active" : ""}`}
                      onClick={() => onClickNote(n)}
                      role="listitem"
                      aria-label={`Open note ${n.title || "Untitled"}`}
                    >
                      <div className="note-card-top">
                        <div className="note-card-title">
                          {n.title.trim() ? n.title : "Untitled"}
                        </div>
                        <div className="note-card-date">
                          {formatDateTime(n.updatedAt)}
                        </div>
                      </div>
                      <div className="note-card-body">
                        {n.body.trim() ? n.body : "—"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="panel panel-right" aria-label="Editor">
            <div className="panel-header">
              <h2 className="panel-title">
                {selectedNote ? "Edit note" : "New note"}
              </h2>
              <div className="panel-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={upsertNote}
                >
                  Save
                </button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={deleteSelected}
                  disabled={!selectedId}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="editor">
              {error ? (
                <div className="alert" role="alert">
                  {error}
                </div>
              ) : null}

              <label className="label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                ref={titleInputRef}
                className="input"
                placeholder="e.g. Shopping list"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />

              <label className="label" htmlFor="body">
                Note
              </label>
              <textarea
                id="body"
                className="textarea"
                placeholder="Write something…"
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={10}
              />

              <div className="editor-footer">
                <div
                  className={`counter ${
                    remainingChars < 0 ? "counter-bad" : ""
                  }`}
                  aria-label="character counter"
                >
                  {remainingChars} chars left
                </div>

                <div className="meta">
                  {selectedNote ? (
                    <>
                      <span>
                        Created:{" "}
                        <span className="mono">
                          {formatDateTime(selectedNote.createdAt)}
                        </span>
                      </span>
                      <span>
                        Updated:{" "}
                        <span className="mono">
                          {formatDateTime(selectedNote.updatedAt)}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="hint">
                      Tip: click a note on the left to edit it.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <span className="mono">↑ ↓</span> Retro vibes, modern React.
        </footer>
      </header>
    </div>
  );
}

export default App;
