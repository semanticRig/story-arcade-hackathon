# Story Arcade

**A daily emotional story-game that lives inside a Reddit post.** Pick your mood ; vote on polls sourced from real Reddit comments ; mark your life bingo ; tag anonymous confessions. Build a streak, unlock your personality archetype, and watch the community canvas come alive.

`Devvit Web` `React 19` `TypeScript` `Redis` `Hono` `Vite 8`

---

## The Hook ; Why Redditors Return Daily

This is the "hook-y" part. Every mechanism is designed to pull you back tomorrow:

| Mechanism | How It Works | Retention Signal |
|-----------|-------------|------------------|
| **Streak System** | 3-day, 7-day, 30-day badges with confetti celebrations | Internal calendar ; "don't break the chain" |
| **Grace Period** | Miss a day? Streak freezes for 48 hours | Loss aversion ; one slip doesn't kill the streak |
| **Personality Archetypes** | 12 archetype lines ; 37 total ; your mood history assigns you one | Identity investment ; "I'm The Radiant this week" |
| **Daily Rotation** | New mood prompt, polls, bingo, confession every 24h at midnight UTC | Appointment mechanic ; FOMO if you miss a day |
| **Live Community** | Canvas updates every 8s ; confession feed populates in real time | Social proof ; "X players today" header badge |
| **UGC Pipeline** | Players submit tomorrow's prompts ; mods approve ; best ones ship | Ownership ; "my prompt might be tomorrow's game" |
| **Personality Reveal** | Weekly recap shows your archetype evolution with 8-bit sprite | Sunday morning ritual ; screenshot worthy |

---

## Play the Demo

**Live Reddit post:** [r/StoryArcadePlaytest](https://reddit.com/r/StoryArcadePlaytest)

**60-second walkthrough:**

1. Open the post ; tap your mood (5 options, emoji + label)
2. Vote on two "This or That" polls (options sourced from real Reddit comments)
3. Fill out your Life Bingo (9 cells from r/Showerthoughts + curated pool)
4. Tag the daily confession (Relatable / WTF / Wholesome / Needs Therapy)
5. Community Arena unlocks after your first interaction:
   - Place 1 pixel on the collaborative 16x16 canvas
   - Vote on the daily hot take (Agree / Disagree / Unsure)
   - Submit your own confession to the live feed
   - Check the Hall of Fame leaderboard

---

## Daily Flow ; User Journey

| Section | You Do | You See After | The Hook |
|---------|--------|---------------|----------|
| **Mood Check** | Tap how you feel | Community mood distribution + your streak count | Streak ticks on *any* submit |
| **This or That** | Pick A or B on 2 polls | Live percentage bars ; option to write your own answer | "I can't believe 73% chose B" ; comment bait |
| **Life Bingo** | Tap cells that apply to your day | Score + heatmap ; confetti on bingo | Collection urge ; "I need to fill the grid tomorrow" |
| **Confession Corner** | Tag an anonymous confession | Majority verdict + tag breakdown | "Needs Therapy" winner = instant comment thread |
| **Community Arena** | Pixel canvas ; hot takes ; confession feed ; hall of fame | Live-updating community dashboard | Social comparison ; "my pixel is still there" |

---

## Architecture

Built entirely on Reddit's Devvit platform ; zero external infrastructure:

```
Reddit Post Webview (React 19)
  │
  ├; /api/daily-config     ; Today's game content
  ├; /api/mood/submit      ; Mood picker
  ├; /api/choice/submit    ; Poll votes
  ├; /api/template/submit  ; Bingo / finger-down
  ├; /api/confession/vote  ; Confession tags
  ├; /api/canvas/*         ; Collaborative pixel grid
  ├; /api/hot-take/*       ; Hot take votes
  ├; /api/confessions/*    ; Community confession feed
  ├; /api/prompts/*        ; UGC prompt pipeline
  ├; /api/results/comment  ; Share to Reddit comments
  └; /api/weekly/recap     ; Personality archetype reveal
            │
    Hono Server (Devvit server runtime)
            │
   Redis (Devvit built-in SDK)
            │
  Daily Cron Job ; New post at midnight UTC
            │
  Reddit API ; r/Showerthoughts, r/AskReddit, r/confession, r/unpopularopinion
```

| Constraint | How We Handle It |
|-----------|-----------------|
| **30s timeout per endpoint** | All Redis ops batched ; weekly recap cached at 1h TTL |
| **No websockets** | Client polling at 8s intervals with visibility-aware pauses |
| **No external fetch from client** | All Reddit API calls happen server-side in cron job |
| **No localStorage** | Everything in Redis ; `UserStats`, `DailyConfig`, all aggregates |
| **5MB Redis limit** | Daily-scoped data has 30-day TTL ; confession feed capped at 100 |
| **No native modules** | Pure TypeScript ; canvas-confetti only npm dependency added |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Platform | Reddit Devvit Web | Native ; zero infra |
| Client | React 19 + TypeScript + Tailwind CSS 4 | Devvit template ; type-safe |
| Server | Hono (Node.js) | <10KB ; fast cold start |
| State | Redis via `@devvit/server` SDK | Built-in ; atomic INCR / SET NX / HINCRBY |
| Content | Reddit API (`getHotPosts`, `getComments`) | Real subreddit content every day |
| Build | Vite 8 + npm | Fast HMR ; tree-shaking |
| Animation | CSS keyframes + canvas-confetti (6KB) | No framework bloat |

---

## Polish ; What Makes It Feel Premium

- **canvas-confetti** on bingo completion, streak milestones, and first-day finish
- **Live polling** ; canvas refreshes every 8s with pixel delta badges ("+3 new pixels!")
- **Next-arcade countdown** in header ; "Reset in 04:32:15"
- **Mobile-first** ; 44px minimum touch targets ; `touch-action: manipulation` on all buttons
- **Reduced motion** ; all 20+ animations disabled when `prefers-reduced-motion: reduce`
- **Stale banner** ; if you're viewing yesterday's post, a banner offers "Play Today's Arcade"
- **8-bit chiptune BGM** ; retro arcade music toggle (Web Audio API)

---

## UGC Pipeline

1. **Player submits** a prompt via "+ Submit Prompt" button (choice question, bingo idea, or confession)
2. **Lands in moderation queue** ; `PromptQueue` in Redis ; `status: pending`
3. **Moderators approve/reject** via `/api/prompts/moderate` (reject with reason if needed)
4. **Approved prompts** enter FIFO rotation ; consumed by daily cron job
5. **"My Submissions" panel** shows each player their submission status
6. **Fallback** ; curated pools of 20+ questions, 46 bingo fillers, 19 confessions ; never an empty day

---

## Development

```bash
npm install
npm run type-check && npm run lint && npm run build   # All clean
npm run dev                                             # Deploy to playtest subreddit
npx vitest run                                          # 13 tests passing
```

---

## Credits

Built for Reddit's **Games with a Hook** Hackathon 2026. Devvit Web platform by Reddit. MIT License.

Voice principle: every prompt sounds like a redditor at 2am ; specific, slightly unhinged, never corporate.
