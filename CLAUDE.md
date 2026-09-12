# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LinguaScroll: a TikTok/Reels-style short-video language-learning feed. Users scroll a personalized
feed that interleaves short videos (with synced subtitles/vocabulary) and quizzes. pnpm workspace
monorepo:

- `apps/api` — NestJS + Drizzle ORM + Postgres backend.
- `apps/mobile` — Expo/React Native app (the feed UI).
- `packages/shared-types` — Zod schemas + inferred types shared by both apps (the wire contract).

Comments throughout the codebase are written in Turkish and are often long, decision-record-style
explanations ("Chunk N — X kararı: ..."). Read them before changing the code they annotate — they
usually explain *why* a non-obvious shape was chosen and what alternative was rejected, not just
what the code does. Match that commenting style (Turkish, rationale-first) when editing existing
files; ask the user if unsure whether a new file should follow the same convention.

## Commands

All commands below assume pnpm and are run from the relevant app directory (`apps/api` or
`apps/mobile`) unless noted. There is no root-level build/test/lint script — each workspace package
has its own.

### API (`apps/api`)

- `pnpm install` (from repo root) — installs all workspaces.
- `docker compose up -d` — starts local Postgres (`linguascroll` db, user/pass `linguascroll`, port 5432).
- Copy `.env.example` → `.env` and `.env.test.example` → `.env.test` before running anything (see
  Environment section below).
- `pnpm run db:generate` — generate a Drizzle migration from `*.schema.ts` changes.
- `pnpm run db:migrate` — apply migrations.
- `pnpm run build` — `tsc -p tsconfig.build.json`.
- `pnpm run typecheck` — `tsc -p . --noEmit`.
- `pnpm run start` — runs the built app (`node dist/main.js`); there is no `start:dev` script, so
  build then start, or run `tsc -p tsconfig.build.json --watch` alongside `start`.
- `pnpm test` — runs the whole Jest suite (unit `*.spec.ts` + integration/e2e `*.e2e-spec.ts`),
  serially (`maxWorkers: 1` — integration/e2e tests share one `linguascroll_test` database, see
  `jest.config.js`).
- `pnpm test -- <path-or-name-pattern>` — run a single test file/pattern, e.g.
  `pnpm test -- feed.service.spec`.
- `pnpm test -- -t "<test name>"` — run tests matching a name.
- Integration/e2e specs need `TEST_DATABASE_URL` (`.env.test`) pointing at a real, migrated Postgres
  database (run `db:migrate` against it, or point it at a fresh db and migrate).
- Seed scripts (run against `dist/`, so `pnpm run build` first): `pnpm run seed`,
  `pnpm run seed:transcripts`, `pnpm run seed:quizzes`, `pnpm run seed:words`.

### STT pipeline (`apps/api/scripts/stt`)

A standalone offline tool, **not** part of the NestJS app — it never writes to the DB, feed, or
mobile. It transcribes a short (15–60s) source video into a draft, timestamped transcript.

- `pnpm run stt:build` — compiles the pipeline's own TypeScript (`scripts/stt/tsconfig.json`).
- `pnpm run stt:test` — runs its Jest suite (separate config: `scripts/stt/jest.config.js`).
- `pnpm run stt:process` — builds then runs `run-stt-pipeline.js` against `scripts/stt/input/`.
- Requires Python 3.11+, `ffmpeg`/`ffprobe` on PATH, and `faster-whisper`
  (`pip install -r scripts/stt/requirements.txt`); see `scripts/stt/README.md` for full usage,
  flags (`--input`, `--keep-temp`, `--content-id`), and the `languageStatus` output contract.

### Mobile (`apps/mobile`)

- `pnpm install`.
- Copy `.env.example` → `.env` and set `EXPO_PUBLIC_API_BASE_URL` to your machine's LAN IP (not
  `localhost` — a physical device can't reach your dev machine's localhost; only web/simulator can).
- `pnpm start` — Expo dev server (`pnpm run android` / `ios` / `web` for a specific target).
- `pnpm run typecheck` / `pnpm run typecheck:test` (uses `tsconfig.jest.json`).
- `pnpm test` — Jest.
- `pnpm test -- <path-or-name-pattern>` — run a single test file.
- Expo has changed significantly since the model's training data — before writing any Expo/RN code,
  read the versioned docs for the pinned version at `https://docs.expo.dev/versions/v57.0.0/`
  (see `apps/mobile/AGENTS.md`, pulled in automatically via `apps/mobile/CLAUDE.md`).

### shared-types (`packages/shared-types`)

- `pnpm run build` — must be rebuilt (`tsc -p .`) after editing a schema for `apps/api`/`apps/mobile`
  to pick up the change, since both depend on it via `workspace:*` and its `main`/`types` point at
  `dist/`.
- `pnpm run typecheck`.

## Architecture

### Contract-first types (`packages/shared-types`)

Every shape that crosses the API/mobile boundary is a Zod schema in `packages/shared-types/src/`,
exported (schema + inferred type) from `src/index.ts`. Both the API and mobile import only from
`@linguascroll/shared-types` — never redeclare a duplicate interface for the same wire shape.
Request/response boundaries call `.parse()` (API controllers/services) so a malformed value fails
loudly instead of silently reaching the client or the DB.

Key distinction to preserve: `PlayableVideo` (base video, no vocabulary) vs. `FeedPlayableVideo`
(same video enriched with per-user vocabulary/saved-state). `VideosService` only ever produces the
former — it's deliberately unaware of the "vocabulary" concept. Only `FeedService` builds the
enriched public shape, and only for the videos actually being returned on that page. Don't add
vocabulary fields to `VideosService`/`VideosRepository`; enrichment belongs in `FeedService`.

### API (`apps/api`) — NestJS, feature-first modules

Each feature under `src/<feature>/` is a self-contained Nest module with (typically):
`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*-repository.ts`, `*.schema.ts` (Drizzle table
def), plus `*.spec.ts` (pure unit tests) and `*.integration.spec.ts` / `*.e2e-spec.ts` (hit the real
test DB / HTTP layer). Layering is strict:

- **Controller**: HTTP concerns only — parses/validates `unknown` request bodies against a Zod
  schema, translates path params (`ParseUUIDPipe`, etc.), calls the service.
- **Service**: use-case orchestration. No SQL/Drizzle. Owns cross-entity business rules (e.g. "path
  resource missing → 404, referenced body resource missing → 400").
- **Repository**: the only place that talks Drizzle/SQL. Batches lookups (`WHERE id IN (...)`)
  instead of looping per-id — feed resolution in particular depends on this (see below).
- **Schema**: the Drizzle table definition. `drizzle.config.ts` globs `src/**/*.schema.ts`, so a new
  feature just needs its own file — no central schema registry to update.

Features: `users`, `videos` (+ transcript segments, watch events), `quizzes` (+ answer events),
`words` (vocabulary + per-user saved words), `personalization` (ranking), `feed` (composition —
depends on all the others). `DatabaseModule` is `@Global()` and is the single place a `pg.Pool` /
Drizzle instance is constructed; feature modules just inject `DRIZZLE_DB`.

**Feed composition (`feed/feed.service.ts`)** is the architectural core and worth reading in full
before touching pagination, ranking, or quiz interleaving:

- `GET /feed` with no cursor starts a session: `PersonalizationService.getPersonalizedVideos` ranks
  the full candidate pool (see `personalization-ranking.ts` — a pure, deterministic Smooth Weighted
  Round Robin over topic affinity, no `Math.random`), the ranked list is bounded to
  `MAX_SESSION_VIDEOS` (27), quizzes are interleaved at a fixed cadence (`VIDEOS_PER_QUIZ`, currently
  2:1 — each quiz must come from a video actually in that group, unused otherwise), and the result
  is frozen into a `{type, id}[]` "plan" — this plan is what `rankVideos`/`interleaveFeed` compute
  once and never re-run.
- A request with a cursor decodes an HMAC-signed (`FEED_CURSOR_SECRET`) cursor
  (`feed-cursor.ts`) back into that same frozen plan + position and continues from there —
  ranking is never redone mid-session.
- `buildPage` resolves a `PAGE_SIZE`-wide (12) raw slice of the plan into real `FeedItem`s in *one*
  batched pass (`Promise.all` across `findVideosByIds`/`findQuizzesByIds`/vocabulary/segments — no
  N+1). If an entire slice resolves to nothing (all referenced rows since deleted), it transparently
  advances to the next slice ("bounded bridging") rather than returning an empty page.
- `playbackUrl` is generated fresh on every resolve, never frozen into the cursor (future
  Mux-signed-URL TTLs would invalidate a stale one).
- `MAX_SESSION_VIDEOS` (feed.service.ts) and `MAX_SESSION_FEED_ITEMS` (feed-cursor.ts) are
  deliberately separate constants (not derived from each other) — `assertFitsSessionBound` checks
  at runtime that the former, combined with the quiz cadence, still fits the latter. If you change
  `VIDEOS_PER_QUIZ` or `MAX_SESSION_VIDEOS`, check that invariant still holds.

**Playback media**: there is no real CDN/Mux integration yet. `resolve-playback-url.ts` maps a
curated set of `muxAssetId` strings to local files served by Nest's static asset middleware
(`main.ts`, `/media/*`, from `apps/api/public/media/`) — an unknown id throws rather than silently
falling back. `PUBLIC_MEDIA_BASE_URL` must be reachable from wherever the client runs (same
localhost-vs-LAN-IP caveat as the mobile API URL).

**Config validation**: `app.module.ts` validates `process.env` against a Zod schema inside
`ConfigModule.forRoot({ validate })`, so a missing/malformed env var fail-fasts at boot, before the
first request — there's no separate config framework/file beyond this.

### Mobile (`apps/mobile`) — feature-first, hook state machines are pure-function-tested

`src/features/<feature>/` mirrors the API's feature boundaries (`feed`, `identity`,
`subtitles`, `preferences`), each with its own `api/` (thin fetch wrappers hitting the NestJS API)
and `components`/`hooks`. `App.tsx` gates the whole feed behind anonymous-identity bootstrap
(`useAnonymousUserId` — `identity.status === "success"` before `<Feed>` ever mounts).

Notable pattern: complex hook state machines (e.g. `use-feed.ts`) separate their state-transition
logic into plain, exported functions (`applyFreshSessionSuccess`, `applyLoadMoreError`,
`canLoadMore`, etc.) that the hook itself calls verbatim. This lets pagination/concurrency/refresh
logic be unit-tested without rendering React Native. Follow this split for new stateful hooks rather
than inlining transition logic into `setState` calls.

`API_BASE_URL` (`shared/api-base-url.ts`) is the one place `EXPO_PUBLIC_API_BASE_URL` is read —
don't re-read `process.env.EXPO_PUBLIC_*` elsewhere.

### Testing conventions (API)

- `*.spec.ts` — pure unit tests, no DB, no Nest DI container.
- `*.integration.spec.ts` — repository-level tests against the real `TEST_DATABASE_URL` database.
- `*.e2e-spec.ts` — full HTTP-layer tests (supertest against a bootstrapped Nest app).
- All of the above run in one Jest project (`maxWorkers: 1`, intentional — see `jest.config.js`)
  because integration/e2e specs share a single Postgres test database and parallel workers would
  truncate/insert into each other's data.
