# Jotter

A lightning-fast note-taking app built for developers who need to think, not fiddle with tools.

**[Try it live](https://jotter.marstol.com/)**

## What is this?

Jotter is what happens when you take Notepad++ and ask "what if this was actually organized?" It's designed for the messy middle of development work—pseudocode, algorithms, quick diagrams, and all the structured thinking that happens before the real code gets written.

The core idea: notes should be as fast as opening a text editor, but with just enough structure to find things later.

**Key features:**

- Four editor types: code (syntax highlighting), rich text, diagrams (Excalidraw), and checklists
- Collections to organize related notes
- Drag-and-drop everything
- Auto-saves constantly (you'll never see a save button)
- Keyboard shortcuts for speed (Alt+N for new notes, etc.)
- Bookmarkable URLs for every note

## Why build this?

Most note apps are either too simple (plain text files) or too structured (notion-style databases). Developers need something in between—a place to dump thoughts quickly but find them later without digging through 500 unnamed files.

This scratches that itch.

## Tech Stack

- **Frontend**: SvelteKit + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Editors**: CodeMirror 6, Quill, Excalidraw
- **Auth**: Google OAuth

The architecture uses a cache-as-database pattern (AppDataManager) with optimistic updates, so everything feels instant even though it's saving to the cloud.

## Local Development

**Prerequisites:**

- Node.js (v18+)
- A Supabase account

**Setup:**

1. Clone the repo:

```bash
git clone git@github.com:siegfried-martin/Jotter.git
cd jotter
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:

```
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the dev server:

```bash
npm run dev
```

The app should be running at `http://localhost:5173`

**Database setup:**
The schema is in the project overview doc. You'll need to run the SQL migrations in your Supabase project to set up the tables and RLS policies.

## Contributing

This project is in active development and welcomes contributors. We use GitHub Issues to track bugs and features.

**Good first issues** are labeled for newcomers who want to get their feet wet. The codebase is relatively straightforward—if you can read Svelte and TypeScript, you can contribute.

**Workflow:**

1. Check out the [Issues](https://github.com/siegfried-martin/jotter/issues) page
2. Comment on an issue you want to work on
3. Fork, make changes, and submit a PR
4. Reference the issue in your PR description (e.g., "Fixes #23")

## Roadmap

**Current focus:**

- Mobile responsiveness improvements
- User testing and feedback collection
- Bug fixes based on real-world usage

**Future ideas:**

- Offline mode
- Markdown export
- More keyboard shortcuts
- Collaborative editing (maybe)

This is very much a "use it to build it" project—features get added when they solve real problems.

## License

MIT

## Questions?

Open an issue or reach out. This is a side project built to solve a real problem, so feedback is always welcome.
