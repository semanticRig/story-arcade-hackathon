# agentic_workflow.md — how the AI agent should operate on this repo

This project is meant to be built primarily by an AI coding agent (Claude Code / Cursor /
Copilot agent mode) working from CLAUDE.md + this file. Below is the operating loop and the
external "skills"/patterns it borrows from, based on current best practice research
(Anthropic's own Claude Code best-practices doc, HumanLayer's CLAUDE.md guide, and the
Saik0s/agent-loop and agenticloops-ai/agentic-ai-engineering GitHub repos on agent
orchestration).

## The core loop: Explore → Plan → Code → Verify → Commit
1. Explore — read agent_docs/architecture.md + data_model.md for the relevant area only.
   Do NOT read the whole repo blindly; use progressive disclosure (read only what's linked
   from CLAUDE.md for the current task).
2. Plan — before writing code for anything non-trivial (new endpoint, new section, schema
   change), write a short plan (bullet list of files touched + why) and self-review it.
   Use "think harder" style reasoning for anything touching Redis schema or the daily
   scheduling job — mistakes there are expensive to unwind.
3. Code — implement in small vertical slices: one section (client component + its endpoint +
   its Redis keys) at a time. Don't build all four sections before testing the first one.
4. Verify — run `npm run build`, then `npm run dev` and manually exercise the new endpoint/
   component in the playtest post. Prefer deterministic checks (typecheck, lint, a quick
   curl/script hitting the endpoint) over asking the model to "review its own code."
5. Commit — small commits, one per vertical slice, clear message describing the section and
   which judging criteria it serves (e.g. "add ChoiceSection + /api/choice/submit — Hook-y").

## Test-driven pattern for scoring/aggregation logic
Any logic that computes scores, streaks, or majority verdicts should be written test-first:
write a small unit test with example inputs/outputs, confirm it fails, then implement. This
matters most for streak logic (date boundary bugs) and confession majority-vote reveal
(off-by-one on the vote threshold).

## Design-driven iteration for UI
For each section, provide the agent with a rough visual reference (a sketch, a screenshot of
an Instagram Story game, or a text description of the desired mood/tone) and have it
implement, screenshot the result (Devvit playtest supports this), and iterate until it matches
— rather than describing pixel values in prose.

## Subagents / specialization (if using an orchestrator like Claude Code's subagents or a
multi-agent setup)
Split by concern, not by file:
- "builder" agent — implements one vertical slice per invocation (client+server+redis)
- "reviewer" agent — checks the diff only against agent_docs/design_principles.md (anti-AI-slop,
  copy tone) and agent_docs/architecture.md (does it match the intended data flow)
- "content" agent — drafts daily prompts (mood options, this-or-that questions, bingo cells,
  confessions) — kept separate from the builder so game content iterates independently of code

This mirrors the pattern described in Saik0s/agent-loop (human orchestrator directing
specialized AI personas for build/test/deploy) and is the same "specialist agents" idea
covered in GitHub's own agents.md guidance (docs, testing, security as separate specialist
roles) — here adapted to (builder, reviewer, content).

## Skills / reusable prompt templates
Store repeatable, parameterized tasks as slash-commands / skill files rather than re-typing
instructions each session, e.g.:
- "new-section" skill — scaffolds a new client Section component + matching /api/ endpoint +
  Redis aggregate, following the exact pattern in ChoiceSection (pointer, not copy).
- "daily-content-pack" skill — given a theme, drafts one day's full DailyConfig (mood options,
  3 choice questions, 1 template, 1 confession) in the correct JSON shape from data_model.md.
- "moderation-pass" skill — given pending PromptSubmissions, drafts approve/reject decisions
  against design_principles.md tone rules for human sign-off (never auto-approve).

## Guardrails (things the agent must never do unsupervised)
- Never auto-approve UGC prompt submissions (design_principles.md has the tone bar; a human
  makes the final call — confessions especially can include unsafe content).
- Never invent Devvit API surface — if unsure whether an SDK method exists, check the official
  Devvit Web docs pattern already established in tech_stack.md rather than guessing.
- Never put secrets or API keys in client code — Devvit Web disallows external client requests
  anyway; anything sensitive belongs server-side.
