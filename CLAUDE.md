# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server on port 9002 (Turbopack)
npm run build         # Production build
npm run lint          # ESLint via next lint
npm run typecheck     # TypeScript check (tsc --noEmit)
npm run genkit:dev    # Start Genkit AI dev server
npm run genkit:watch  # Watch mode for Genkit AI flows
```

No test framework is configured.

## Environment

Requires `GEMINI_API_KEY` in the environment. Additional API keys (Pixabay, Freesound, AWS) are stored per-user in Firestore and retrieved at runtime via server actions — they are not environment variables.

## Architecture

**Stack:** Next.js 15 (App Router) + React 19, Firebase (Auth + Firestore), Google Genkit + Gemini 2.5-flash, Radix UI + TailwindCSS, React Hook Form + Zod.

### Route Groups

- `(dashboard)/` — protected routes requiring Firebase auth
- `(public)/` — unauthenticated routes (login)
- `api/media/visual/` and `api/media/audio/` — proxy routes for Pixabay and Freesound APIs

### AI Layer (`src/ai/`)

All AI logic uses Google Genkit. The main flow is `src/ai/flows/generate-initial-scenes.ts`, called via a server action in `src/lib/actions.ts`. Genkit config (model, plugins) lives in `src/ai/genkit.ts`. The dev CLI entry is `src/ai/dev.ts`.

### Data Layer (`src/firebase/`)

Firebase SDK is initialized client-side in `src/firebase/index.ts` and server-side in `src/firebase/server.ts`. React hooks for real-time Firestore subscriptions are in `src/firebase/firestore/use-doc.tsx` and `use-collection.tsx`. The `FirebaseProvider` in `src/firebase/provider.tsx` wraps the app.

### Server Actions (`src/lib/actions.ts`)

Server actions handle: AI scene generation (calls Genkit flow), Pixabay image/video search, Freesound audio search, and Firestore reads/writes. API keys from Firestore are fetched inside these actions before calling external services.

### Core Types (`src/lib/types.ts`)

`VideoProject` and `Scene` are the central data models. A `Scene` contains: `title`, `narration`, `duration`, `visualKeywords`, `audioKeywords`, `selectedVisual`, `selectedAudio`, `transitionImage`.

### User Workflow

1. `/new-project` → user enters a prompt → server action calls Gemini → generates `Scene[]` → saved to Firestore
2. `/projects/[projectId]` → multi-step editor: edit scenes → search visuals (Pixabay) → search audio (Freesound) → select transitions from a curated 40+ asset library (`src/lib/placeholder-images.ts`)
3. Export step → choose TTS provider + render options → produces a JSON payload consumed by a separate backend

### Component Organization

- `src/components/ui/` — Radix/Shadcn primitives (don't modify directly)
- `src/components/workflow/` — domain components for the scene editor workflow
- `src/components/layout/` — shell, sidebar, navigation

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Styling

TailwindCSS with a custom theme defined in `tailwind.config.ts`. Sidebar uses CSS variables. Use `cn()` from `src/lib/utils.ts` for conditional class merging.
