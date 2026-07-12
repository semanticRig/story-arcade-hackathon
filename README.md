# Story Arcade

**A daily emotional story-game inside a Reddit post.** Tell your story, see how the room feels, and build something together — one day at a time.

---

## What is Story Arcade?

Every day, a new Reddit post appears with a fresh arcade. You walk through 5 sections:

| Section | What you do | Instant payoff |
|---------|-------------|----------------|
| **Mood Check** | Tap how you feel | See the community mood aggregate live |
| **This or That** | Vote on 2 polls | Live percentage bars from real Reddit comments |
| **Life Bingo** | Tap 9 cells that apply | Score tallied, cells sourced from r/Showerthoughts |
| **Confession Corner** | Tag a daily confession | Community verdict on Relatable/WTF/Wholesome |
| **Community Arena** | Place 1 pixel, vote hot takes, submit confessions | See the canvas emerge, feed populates in real time |

As you play, you build **streaks** (3-day, 7-day, 30-day), earn **badges**, and unlock your **Weekly Personality Profile** — 23 unique labels from "The Hype Architect" to "The Gremlin."

---

## Why this belongs on Reddit

- **Every interaction creates content** — confessions appear in a live feed, pixels paint a shared canvas, poll results become discussion threads
- **Built FOR Reddit's feed** — dynamic post titles based on yesterday's community mood: "Yesterday was 72% fired up energy. How are you showing up today?"
- **Streaks + badges = daily ritual** — the hook that brings people back
- **Share to comments** — formatted receipts with monospace progress bars, hero facts, and streak motivation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Reddit Devvit Web (embedded in Reddit posts) |
| Client | React 19, Tailwind CSS 4, TypeScript |
| Server | Hono (Node.js), TypeScript |
| State | Redis (Devvit built-in) |
| Content | Reddit API (r/Showerthoughts, r/AskReddit, r/confession, r/unpopularopinion) |
| Sound | 8-bit sound engine, retro arcade music toggle |
| Build | Vite 8, npm |

---

## For Judges

### How to test
1. Open the post in any subreddit with the Story Arcade app installed
2. Complete all 5 sections (takes ~60 seconds)
3. Explore the Community Arena (canvas, hot takes, confessions, Hall of Fame)
4. Click "Share to Comments" to see the formatted receipt
5. Open "My Week" for your personality profile

### What to look for
- **Progressive reveal**: Community Arena appears after your first interaction — no completion gate
- **Content freshness**: Bingo tiles come from real r/Showerthoughts posts, poll options from Reddit comments
- **UGC flywheel**: Submit a confession → appears in the feed instantly → others see it
- **Mobile-first**: 44px tap targets, touch-friendly spacing, progress bar in header
- **Dynamic posts**: Each day's post title changes based on the previous day's mood

### Demo data
If the community sections appear empty, click the "Seed Demo" button (bottom right) to populate 7 days of moods, a smiley face on the canvas, confessions, and Hall of Fame entries.

---

## Project Structure

```
src/
├── client/
│   ├── components/   # React components (15 total)
│   │   ├── DailyArcadeScreen.tsx
│   │   ├── MoodSection.tsx, ChoiceSection.tsx
│   │   ├── TemplateSection.tsx, ConfessionSection.tsx
│   │   ├── ResultsCard.tsx, WeeklyRecapCard.tsx
│   │   ├── DailyCanvasSection.tsx, HotTakeSection.tsx
│   │   ├── LiveConfessionsFeed.tsx, HallOfFameSection.tsx
│   │   ├── StreakBar.tsx, RetroIcons.tsx, SubmitPromptModal.tsx
│   │   └── MusicToggle.tsx, Toast.tsx
│   ├── hooks/        # React hooks
│   └── index.css     # Tailwind + custom animations
├── server/
│   ├── routes/api.ts # 18 API endpoints
│   ├── core/         # Content generation, seeding
│   └── jobs/         # Daily rotation cron
└── shared/
    ├── api.ts        # Shared types
    └── commentFormat.ts  # Comment formatting
```

---

## Development

```bash
npm install
npm run type-check && npm run lint && npm run build
npm run dev          # Deploy to playtest subreddit
```

## Known Limitations (Hackathon Alpha)

- **Reddit API rate limiting**: Content bank fetches from 4 subreddits (r/Showerthoughts, r/AskReddit, r/confession, r/unpopularopinion) are rate-limited during peak usage. Bingo tiles and confession text fall back to curated pools when Reddit API is unavailable. Planned improvement: increased rate-limit budget via Reddit developer program + pre-cached weekly content banks.
- **Playtest-only deployment**: Currently tested on private playtest subreddit. Production deployment requires Reddit app review.
- **30-second endpoint limit**: Weekly recap queries 7 days of Redis data sequentially. Optimization to parallelize with `Promise.all` is planned.

---

Built for Reddit's "Games with a Hook" Hackathon.
