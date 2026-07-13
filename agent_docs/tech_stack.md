# tech_stack.md

## Platform
- Devvit Web (Reddit developer platform) — client/server split, hosted by Reddit.
  Hard limits: 30s max per endpoint call, 4MB max request payload, 10MB max response,
  no websockets/streaming, no fs or native node modules, no external requests from client
  (server can fetch externally), localStorage wiped on every app version bump → use Redis.

## Client
- React + TypeScript (Devvit Web React template as starting scaffold)
- Plain CSS or a light utility layer (no heavy CSS framework — keep bundle small for webview)
- Optional: Phaser (only if pursuing "Best Use of Phaser" award — used for animated feedback,
  not core game logic, to avoid overengineering)

## Server
- Node.js (Devvit-provided serverless runtime)
- Hono (lightweight router, recommended by Devvit docs over Express for this environment)
- @devvit/server SDK — Redis client, Reddit API client, auth middleware
- @devvit/client SDK — client-side helpers for talking to Devvit context

## Config
- devvit.json — app manifest: post config, scheduled jobs (daily rotation), permissions,
  menu entries. Replaces legacy devvit.yaml.

## Tooling
- npm for package management, Node 22+
- TypeScript strict mode
- Biome (or eslint+prettier) for lint/format — run via script, never ask the LLM to manually
  reformat code
- Devvit CLI (`npm run dev`, `npm run launch`) for local playtest and publishing

## Why these choices
- Standard web stack (React, Node) was explicitly chosen by Reddit for Devvit Web so that
  AI coding agents work reliably against it — leaning into that was intentional.
- Redis over any external DB: it's built-in, zero infra to manage, and fits the serverless
  30s-per-request constraint.
- Hono over Express: smaller, faster cold start, better suited to Devvit's serverless model.
