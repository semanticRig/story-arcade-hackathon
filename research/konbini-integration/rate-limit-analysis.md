# KonbiniAPI Integration — Rate Limit Analysis

## The Problem

Story Arcade hits Reddit API rate limits on fresh deploy when seeding the daily game content.

### When it happens

First load after deploy, with no Redis cache:

1. `buildContentBank()` — 4 sequential `reddit.getHotPosts()` calls
   - AskReddit, confession, unpopularopinion, Showerthoughts
   - 500ms delays between each, but still 4 API hits in ~2 seconds

2. `generateDailyContent()` fallback path — if bank isn't ready:
   - 4 **parallel** `reddit.getHotPosts()` via `Promise.all()` (no delays!)
   - Then 2 `reddit.getComments()` calls for poll options
   - ~10 Reddit API calls in rapid succession

### The error

Reddit API returns **429 "Too Many Requests"**. Retry logic in `fetchPostTitles()` and `fetchTopComments()` catches patterns `'rate'`, `'429'`, `'limit'`, `'Too Many'` — backs off 2s/4s and retries up to 3x. But parallel calls hitting the limit simultaneously compound the problem.

### Files involved

- `src/server/core/content.ts` — `buildContentBank()`, `generateDailyContent()`, `fetchPostTitles()`, `fetchTopComments()`
- `src/server/jobs/dailyRotation.ts` — midnight cron calls both functions
- `src/server/routes/api.ts` — `/daily-config` endpoint calls both on cache miss
- `.issues/closed/2026-07-11-rate-limit-on-fresh-deploy-reddit-api-returns-429.md` — documented issue

## KonbiniAPI Angle

FdezRomero's KonbiniAPI scrapes Reddit anonymously (no auth tokens, no rate limits). If we replace Devvit's `reddit.*` calls with KonbiniAPI HTTP fetches, we bypass Reddit's rate limits entirely.

### What we'd replace

| Devvit API Call | What it does | KonbiniAPI equivalent? |
|---|---|---|
| `reddit.getHotPosts({ subredditName, limit })` | Fetch hot post titles from a subreddit | Need: subreddit post listing endpoint |
| `reddit.getComments({ postId, limit, sort })` | Fetch top comments on a post | Need: post comments endpoint |

### What we'd need to verify

1. Does KonbiniAPI have subreddit/hot listing and comment endpoints?
2. Do the response shapes map to what we need (title, postId, comment text)?
3. Latency — KonbiniAPI avg is 700ms, which is fine for a daily job
4. Add KonbiniAPI domain to `devvit.json` permissions:
   ```json
   "http": {
     "enable": true,
     "domains": [
       "api.groq.com",
       "generativelanguage.googleapis.com",
       "api.konbini.com"  // or whatever the domain is
     ]
   }
   ```

### Approach

Write an adapter layer that wraps KonbiniAPI calls behind the same interface as `fetchPostTitles()` and `fetchTopComments()`. Keep the retry/backoff logic but remove rate-limit-specific handling since KonbiniAPI doesn't have those limits.

## Conversation Context

Chat with FdezRomero (KonbiniAPI creator):

- He built everything from scratch — scrapers, infra, monitoring
- Reverse-engineered every platform to fetch without login
- No LLMs involved — 99.2% success rate, avg 700ms response time
- 450k credits = 450k requests, resets monthly
- No imposed rate limits — scales horizontally
- Bootstrapped, not VC-backed (passed on YC)
- Positioned as "social media infrastructure you can build products on top of"
- He's in our test subreddit for feedback

## Next steps

- [ ] Get FdezRomero to answer: "Does KonbiniAPI have subreddit listing + comment endpoints?"
- [ ] Get API docs or endpoint reference
- [ ] Design adapter layer (`src/server/core/konbini.ts`)
- [ ] Add domain to devvit.json permissions
- [ ] Wire up as optional backend (fallback to Devvit API if Konbini key is missing)
