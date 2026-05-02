# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js 15 App Router project rooted in `src/`. Use `src/app/` for routes and API handlers, with protected pages under `src/app/(dashboard)/` and public auth pages under `src/app/(public)/`. Keep reusable UI primitives in `src/components/ui/`, workflow-specific features in `src/components/workflow/`, and shared helpers in `src/lib/`. Firebase setup and Firestore hooks live in `src/firebase/`, while Genkit flows and AI config live in `src/ai/`. Reference docs and backend payload notes are in `docs/`.

## Build, Test, and Development Commands
Run `npm install` to install dependencies. Use `npm run dev` to start the app locally on port `9002` with Turbopack. Use `npm run build` for a production build, `npm run lint` for ESLint via Next.js, and `npm run typecheck` for strict TypeScript validation. For AI flow work, run `npm run genkit:dev` or `npm run genkit:watch`.

## Coding Style & Naming Conventions
Write TypeScript with `strict` mode expectations and use the `@/*` path alias from `tsconfig.json`. Follow the existing pattern: React components in `PascalCase.tsx`, hooks in `kebab-case` files prefixed with `use-`, and shared utilities in lowercase `src/lib/` modules. Prefer functional React components, Tailwind utility classes, and `cn()` from `src/lib/utils.ts` for class composition. Treat `src/components/ui/` as generated Shadcn/Radix primitives; extend them carefully instead of rewriting them casually.

## Testing Guidelines
There is no automated test framework configured yet. At minimum, run `npm run lint` and `npm run typecheck` before opening a PR. When adding tests later, place them beside the feature or under a dedicated `tests/` directory, and name files `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Recent history uses short Conventional Commit-style messages such as `feat(config): update audio smooth`. Follow `type(scope): summary` when possible, for example `fix(editor): validate missing bg audio`. Keep commits focused. PRs should include a clear description, note any Firebase/AI/env changes, link the related issue, and attach screenshots or short recordings for UI changes.

## Security & Configuration Tips
Keep secrets out of git. Local bootstrap requires `.env` with `GEMINI_API_KEY`; user-specific provider keys are stored in Firestore at runtime. Do not commit `.env`, API tokens, or exported user data.
