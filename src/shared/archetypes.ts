// ---------------------------------------------------------------------------
// Personality Archetype System — "What's your Reddit soul?"
//
// 12 archetype lines, 3 tiers each. Assignment is pure computation from
// mood history + streak data. No external API calls needed.
//
// Nemotron 550B: "Your secret weapon. Build that, you win."
// ---------------------------------------------------------------------------

// ── Types ──────────────────────────────────────────────────────────────────

export interface Archetype {
  id: string;
  name: string;
  emoji: string;
  tier: 1 | 2 | 3;
  description: string;
  /** 8-line × 8-char monospace sprite using █ ░ ▒ ▓ chars */
  sprite: string;
  /** The family line this archetype belongs to */
  line: string;
  /** Days played needed to reach this tier (minimum) */
  daysRequired: number;
}

export interface ArchetypeLine {
  id: string;
  name: string;
  /** Mood keys that map to this line */
  moodKeys: string[];
  tiers: {
    1: Archetype;
    2: Archetype;
    3: Archetype;
  };
}

// ── 8-bit Sprite Helper ────────────────────────────────────────────────────

/** Join an array of 8 strings into a monospace sprite block */
function sprite(rows: string[]): string {
  return rows.join('\n');
}

// ── 12 Archetype Lines ─────────────────────────────────────────────────────
//
// Each line has 3 tiers with escalating sprite detail:
//   Tier 1 (days 3-6):    Simple outline
//   Tier 2 (days 7-13):   Filled, more detail
//   Tier 3 (days 14+):    Fully detailed, glowing
//
// Sprites are 8×8 monospace art. Characters:
//   █ = solid, ▓ = dark, ▒ = medium, ░ = light, · = empty/dot
//   ╔╗╚╝║═ = box drawing for frames

export const ARCHETYPE_LINES: ArchetypeLine[] = [
  // ── 1. Radiant Line (happy dominant) ─────────────────────────────────────
  {
    id: 'radiant',
    name: 'Radiant',
    moodKeys: ['happy'],
    tiers: {
      1: {
        id: 'optimist',
        name: 'The Optimist',
        emoji: '🌤️',
        tier: 1,
        line: 'radiant',
        daysRequired: 3,
        description: 'You see the bright side — even when things are on fire. Your good vibes are just getting started.',
        sprite: sprite([
          ' ······ ',
          ' · ██ · ',
          '·████··',
          '·████··',
          '·████··',
          ' · ██ · ',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'radiant',
        name: 'The Radiant',
        emoji: '☀️',
        tier: 2,
        line: 'radiant',
        daysRequired: 7,
        description: 'You show up with good vibes every single day. Your warmth is legendary and the community feels it.',
        sprite: sprite([
          ' ······ ',
          ' ░ ██ ░ ',
          '░██████░',
          '·██████·',
          '·██████·',
          '░██████░',
          ' ░ ██ ░ ',
          ' ······ ',
        ]),
      },
      3: {
        id: 'beacon',
        name: 'The Beacon',
        emoji: '✨',
        tier: 3,
        line: 'radiant',
        daysRequired: 14,
        description: 'A radiant force of nature. You light up every room — and every arcade. The community orients around your energy.',
        sprite: sprite([
          ' ░░░░░░ ',
          '░▒████▒░',
          '░██████░',
          '▒██▒▒██▒',
          '▒██▒▒██▒',
          '░██████░',
          '░▒████▒░',
          ' ░░░░░░ ',
        ]),
      },
    },
  },

  // ── 2. Deep Thinker Line (sad dominant) ──────────────────────────────────
  {
    id: 'deep-thinker',
    name: 'Deep Thinker',
    moodKeys: ['sad'],
    tiers: {
      1: {
        id: 'feeler',
        name: 'The Feeler',
        emoji: '🌧️',
        tier: 1,
        line: 'deep-thinker',
        daysRequired: 3,
        description: 'You feel things deeply. That\'s not weakness — it\'s the start of something profound.',
        sprite: sprite([
          ' ······ ',
          ' · ░░ · ',
          '··████·',
          '··█▒▒█·',
          '··███··',
          '·· █ ··',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'deep-thinker',
        name: 'The Deep Thinker',
        emoji: '🌙',
        tier: 2,
        line: 'deep-thinker',
        daysRequired: 7,
        description: 'Between overthinking and insight lies your superpower. You see what others miss, and feel what others ignore.',
        sprite: sprite([
          ' ·····░ ',
          ' ··███░ ',
          '·█████░ ',
          '·█▒▒██░ ',
          '·█████░ ',
          '·█████░ ',
          ' ░████░ ',
          '  ░░░░  ',
        ]),
      },
      3: {
        id: 'oracle',
        name: 'The Oracle',
        emoji: '🔮',
        tier: 3,
        line: 'deep-thinker',
        daysRequired: 14,
        description: 'You don\'t just think deeply — you see the future. Your emotional depth is now prophetic insight. The arcade awaits your wisdom.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒████▒░',
          '░█▓▓▓▓█░',
          '▒█▓██▓█▒',
          '▒█▓██▓█▒',
          '░█▓▓▓▓█░',
          '░▒████▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 3. Firebrand Line (angry dominant) ───────────────────────────────────
  {
    id: 'firebrand',
    name: 'Firebrand',
    moodKeys: ['angry'],
    tiers: {
      1: {
        id: 'spark',
        name: 'The Spark',
        emoji: '🔥',
        tier: 1,
        line: 'firebrand',
        daysRequired: 3,
        description: 'That fire in your belly? It\'s fuel. Channel it right and you\'ll be unstoppable. The spark is lit.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ·█▓█· ',
          ' ·█▓█··',
          ' ·███··',
          ' ··█···',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'firebrand',
        name: 'The Firebrand',
        emoji: '⚡',
        tier: 2,
        line: 'firebrand',
        daysRequired: 7,
        description: 'Passion meets purpose. You came back angry and you came to win. Respect the fire.',
        sprite: sprite([
          ' ···█···',
          ' ··███··',
          ' ·█▓▓█··',
          '·██▓██·',
          '·█▓▓▓█·',
          '··███··',
          '···█···',
          '·······',
        ]),
      },
      3: {
        id: 'phoenix',
        name: 'The Phoenix',
        emoji: '🐦‍🔥',
        tier: 3,
        line: 'firebrand',
        daysRequired: 14,
        description: 'You\'ve been through the fire and emerged transformed. Nothing can stop you now. Rise.',
        sprite: sprite([
          ' ···▒···',
          ' ··███··',
          '·░█▓▓█░·',
          '░██▓▓██░',
          '·▒▓▓▓▓▒·',
          '··░██░··',
          '···▒▒···',
          '·······',
        ]),
      },
    },
  },

  // ── 4. Enthusiast Line (excited dominant) ────────────────────────────────
  {
    id: 'enthusiast',
    name: 'Enthusiast',
    moodKeys: ['excited'],
    tiers: {
      1: {
        id: 'hype',
        name: 'The Hype',
        emoji: '🎉',
        tier: 1,
        line: 'enthusiast',
        daysRequired: 3,
        description: 'Your energy is contagious. Never let anyone dim it. The party starts with you.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          '·█████·',
          '·███·· ',
          '··███··',
          '·· █ ··',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'enthusiast',
        name: 'The Enthusiast',
        emoji: '🚀',
        tier: 2,
        line: 'enthusiast',
        daysRequired: 7,
        description: 'You don\'t just bring hype — you build it from the ground up. Launch sequence initiated.',
        sprite: sprite([
          ' ··░··· ',
          ' ·░██░· ',
          '·░████░·',
          '·██▒▒██·',
          '·██████·',
          '··████··',
          '···██···',
          '·······',
        ]),
      },
      3: {
        id: 'catalyst',
        name: 'The Catalyst',
        emoji: '💫',
        tier: 3,
        line: 'enthusiast',
        daysRequired: 14,
        description: 'You don\'t just participate — you transform every room you enter. Reactions accelerate in your presence. Pure kinetic energy.',
        sprite: sprite([
          ' ░░░░░░ ',
          '░▒████▒░',
          '▒██████▒',
          '░██▓▓██░',
          '▒██▓▓██▒',
          '░██████░',
          '░▒████▒░',
          ' ░░░░░░ ',
        ]),
      },
    },
  },

  // ── 5. Survivor Line (tired dominant) ────────────────────────────────────
  {
    id: 'survivor',
    name: 'Survivor',
    moodKeys: ['tired'],
    tiers: {
      1: {
        id: 'trooper',
        name: 'The Trooper',
        emoji: '☕',
        tier: 1,
        line: 'survivor',
        daysRequired: 3,
        description: 'Running on fumes but still showing up. That\'s not weakness — that\'s grit. One foot in front of the other.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ··██·· ',
          ' ·████· ',
          ' ·████· ',
          ' ··██·· ',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'survivor',
        name: 'The Survivor',
        emoji: '🛡️',
        tier: 2,
        line: 'survivor',
        daysRequired: 7,
        description: 'Tired but here. That\'s the definition of dedication. You\'ve weathered storms and you\'re still standing.',
        sprite: sprite([
          ' ·░██░· ',
          '·░████░·',
          '░██▓▓██░',
          '░██▓▓██░',
          '░██████░',
          '·░████░·',
          '··░██░··',
          '·······',
        ]),
      },
      3: {
        id: 'unbreakable',
        name: 'The Unbreakable',
        emoji: '💪',
        tier: 3,
        line: 'survivor',
        daysRequired: 14,
        description: 'You\'ve been through it all and came out stronger. Not just surviving — thriving. The arcade salutes your endurance.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒████▒░',
          '▒██▓▓██▒',
          '▒█▓██▓█▒',
          '▒█▓██▓█▒',
          '▒██▓▓██▒',
          '░▒████▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 6. Zen Line (chill dominant) ─────────────────────────────────────────
  {
    id: 'zen',
    name: 'Zen',
    moodKeys: ['chill'],
    tiers: {
      1: {
        id: 'calm',
        name: 'The Calm',
        emoji: '🧘',
        tier: 1,
        line: 'zen',
        daysRequired: 3,
        description: 'Unbothered. In your lane. The storm rages but you\'re the eye. Breathe.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ·█··█· ',
          ' ·█··█· ',
          ' ·█··█· ',
          ' ··██·· ',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'zen-master',
        name: 'The Zen Master',
        emoji: '☯️',
        tier: 2,
        line: 'zen',
        daysRequired: 7,
        description: 'Moisturized. Unbothered. Thriving. You\'ve achieved a level of chill that others can only aspire to.',
        sprite: sprite([
          ' ··░░·· ',
          ' ·░▒▒░· ',
          '·░█▒▒█░·',
          '·░▒▐▌▒░·',
          '·░▒▐▌▒░·',
          '·░█▒▒█░·',
          ' ·░▒▒░· ',
          ' ··░░·· ',
        ]),
      },
      3: {
        id: 'transcendent',
        name: 'The Transcendent',
        emoji: '🪷',
        tier: 3,
        line: 'zen',
        daysRequired: 14,
        description: 'You\'ve transcended vibes entirely. You ARE the vibe. The arcade doesn\'t affect you — you affect the arcade.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒▓▓▓▓▒░',
          '▒▓████▓▒',
          '░█▓▒▒▓█░',
          '░█▓▒▒▓█░',
          '▒▓████▓▒',
          '░▒▓▓▓▓▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 7. Spiral Line (anxious dominant) ────────────────────────────────────
  {
    id: 'spiral',
    name: 'Spiral',
    moodKeys: ['anxious'],
    tiers: {
      1: {
        id: 'spinner',
        name: 'The Spinner',
        emoji: '🌀',
        tier: 1,
        line: 'spiral',
        daysRequired: 3,
        description: 'The thoughts are spinning — but you\'re learning to ride them. Every spiral has a center.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ·████· ',
          ' ·█··█· ',
          ' ·████· ',
          ' ··██·· ',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'spiral-surfer',
        name: 'The Spiral Surfer',
        emoji: '🌊',
        tier: 2,
        line: 'spiral',
        daysRequired: 7,
        description: 'You ride the waves of anxiety like a pro. The spiral doesn\'t own you — you own the spiral.',
        sprite: sprite([
          ' ·░··░· ',
          '·░░··░░·',
          '·░█▓▓█░·',
          '··█▓▓█··',
          '·░█▓▓█░·',
          '·░░··░░·',
          '·░····░·',
          '·······',
        ]),
      },
      3: {
        id: 'navigator',
        name: 'The Navigator',
        emoji: '🧭',
        tier: 3,
        line: 'spiral',
        daysRequired: 14,
        description: 'You\'ve mapped the spiral and now you guide others through it. From chaos comes clarity. You are the compass.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒▓██▓▒░',
          '▒▓▒▒▒▒▓▒',
          '░█▓██▓█░',
          '░█▓██▓█░',
          '▒▓▒▒▒▒▓▒',
          '░▒▓██▓▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 8. Chaotic Line (chaotic dominant) ───────────────────────────────────
  {
    id: 'chaotic',
    name: 'Chaotic',
    moodKeys: ['chaotic'],
    tiers: {
      1: {
        id: 'rascal',
        name: 'The Rascal',
        emoji: '👾',
        tier: 1,
        line: 'chaotic',
        daysRequired: 3,
        description: 'Chaos is your playground. You don\'t follow the rules — you discover them by breaking them.',
        sprite: sprite([
          ' ·█·█·· ',
          '·█·█·█·',
          '█·█·█·█',
          '·█·█·█·',
          '█·█·█·█',
          '·█·█·█·',
          '··█·█··',
          '·······',
        ]),
      },
      2: {
        id: 'gremlin',
        name: 'The Gremlin',
        emoji: '🐉',
        tier: 2,
        line: 'chaotic',
        daysRequired: 7,
        description: 'Chaos is a ladder, and you\'re climbing it. The gremlin energy is unmatched. Embrace the mayhem.',
        sprite: sprite([
          ' ░█··█░ ',
          '█·▓▒▒▓·█',
          '·█▓▒▒▓█·',
          '··█▓▓█··',
          '·██▒▒██·',
          '█·█▓▓█·█',
          ' ░████░ ',
          '  ···   ',
        ]),
      },
      3: {
        id: 'anarchist',
        name: 'The Anarchist',
        emoji: '👑',
        tier: 3,
        line: 'chaotic',
        daysRequired: 14,
        description: 'You\'re not just chaotic — you\'re chaos royalty. The arcade bends to your will. Long may you reign.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░█▓▒▒▓█░',
          '▒█▓██▓█▒',
          '█▒▓▒▒▓▒█',
          '█▒▓▒▒▓▒█',
          '▒█▓██▓█▒',
          '░█▓▒▒▓█░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 9. Dreamer Line (hopeful dominant) ───────────────────────────────────
  {
    id: 'dreamer',
    name: 'Dreamer',
    moodKeys: ['hopeful'],
    tiers: {
      1: {
        id: 'wisher',
        name: 'The Wisher',
        emoji: '🌠',
        tier: 1,
        line: 'dreamer',
        daysRequired: 3,
        description: 'You\'re looking up at the stars. Something tells you one of them is yours. Keep wishing.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ·████· ',
          '··█▓█··',
          ' ·███··',
          ' ··█···',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'dreamer',
        name: 'The Dreamer',
        emoji: '🌈',
        tier: 2,
        line: 'dreamer',
        daysRequired: 7,
        description: 'Manifesting, believing, achieving. You don\'t just dream — you build bridges to your dreams.',
        sprite: sprite([
          ' ·░··░· ',
          '·░▒▒▒▒░·',
          '·░████░·',
          '··▓▓▓▓··',
          '··████··',
          '···▒▒···',
          '····█···',
          '·······',
        ]),
      },
      3: {
        id: 'manifestor',
        name: 'The Manifestor',
        emoji: '🪐',
        tier: 3,
        line: 'dreamer',
        daysRequired: 14,
        description: 'You don\'t wish upon stars — you become one. Dreams aren\'t distant anymore. They\'re here. You made them.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒████▒░',
          '▒█▓▓▓▓█▒',
          '░█▓██▓█░',
          '░█▓██▓█░',
          '▒█▓▓▓▓█▒',
          '░▒████▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },

  // ── 10. Heartfelt Line (loved dominant) ──────────────────────────────────
  {
    id: 'heartfelt',
    name: 'Heartfelt',
    moodKeys: ['loved'],
    tiers: {
      1: {
        id: 'softie',
        name: 'The Softie',
        emoji: '💝',
        tier: 1,
        line: 'heartfelt',
        daysRequired: 3,
        description: 'You lead with your heart. In a world of armor, that\'s the bravest thing. Stay soft.',
        sprite: sprite([
          ' ······ ',
          ' ·█··█· ',
          '·██··██·',
          '·██··██·',
          '·██████·',
          '··████··',
          '···██···',
          '·······',
        ]),
      },
      2: {
        id: 'heartfelt',
        name: 'The Heartfelt',
        emoji: '💖',
        tier: 2,
        line: 'heartfelt',
        daysRequired: 7,
        description: 'Out here catching feelings and winning hearts. Your emotional honesty is a gift to everyone around you.',
        sprite: sprite([
          ' ·█··█· ',
          '·██··██·',
          '·██▓▓██·',
          '·██▓▓██·',
          '·██████·',
          '··████··',
          '···██···',
          '·······',
        ]),
      },
      3: {
        id: 'beloved',
        name: 'The Beloved',
        emoji: '💞',
        tier: 3,
        line: 'heartfelt',
        daysRequired: 14,
        description: 'Your heart doesn\'t just beat — it resonates. The entire arcade feels your warmth. You are loved, and it shows.',
        sprite: sprite([
          ' ░█▒▒█░ ',
          '░██▓▓██░',
          '▒██▓▓██▒',
          '█▒█▓▓█▒█',
          '█▒█▓▓█▒█',
          '▒██▓▓██▒',
          '░██▓▓██░',
          ' ░█▒▒█░ ',
        ]),
      },
    },
  },

  // ── 11. Explorer Line (adventurous dominant) ─────────────────────────────
  {
    id: 'explorer',
    name: 'Explorer',
    moodKeys: ['adventurous'],
    tiers: {
      1: {
        id: 'wanderer',
        name: 'The Wanderer',
        emoji: '🧳',
        tier: 1,
        line: 'explorer',
        daysRequired: 3,
        description: 'New experiences or bust. Your feet are itching and the road is calling. Adventure awaits.',
        sprite: sprite([
          ' ······ ',
          ' ··██·· ',
          ' ·████· ',
          ' ·█··█· ',
          ' ··██·· ',
          ' ··██·· ',
          ' ······ ',
          ' ······ ',
        ]),
      },
      2: {
        id: 'explorer',
        name: 'The Explorer',
        emoji: '🗺️',
        tier: 2,
        line: 'explorer',
        daysRequired: 7,
        description: 'You\'re gonna need a bigger passport. Every day is a new territory. Map? You ARE the map.',
        sprite: sprite([
          ' ·░··░· ',
          '·░▒▒▒▒░·',
          '·░█▓▓█░·',
          '··████··',
          '·██··██·',
          '·█····█·',
          '··░··░··',
          '·······',
        ]),
      },
      3: {
        id: 'pioneer',
        name: 'The Pioneer',
        emoji: '🏔️',
        tier: 3,
        line: 'explorer',
        daysRequired: 14,
        description: 'You don\'t follow trails — you blaze them. The arcade has never seen an explorer like you. This is uncharted territory.',
        sprite: sprite([
          ' ░░▒▒░░ ',
          '░▒████▒░',
          '▒█▓▓▓▓█▒',
          '░█▓██▓█░',
          '░█▓██▓█░',
          '▒█▓▒▒▓█▒',
          '░▒████▒░',
          ' ░░▒▒░░ ',
        ]),
      },
    },
  },
];

// ── The Newcomer (special, no mood pattern yet) ─────────────────────────────

export const NEWCOMER: Archetype = {
  id: 'newcomer',
  name: 'The Newcomer',
  emoji: '🌱',
  tier: 1,
  line: 'none',
  daysRequired: 0,
  description: 'Fresh meat. We love to see it. Play 3 days to unlock your true archetype. Your story begins now.',
  sprite: sprite([
    ' ······ ',
    ' ··██·· ',
    ' ·█··█· ',
    ' ··██·· ',
    ' ··██·· ',
    ' ··██·· ',
    ' ······ ',
    ' ······ ',
  ]),
};

// ── Lookup ──────────────────────────────────────────────────────────────────

/** Map of archetype ID → Archetype (includes all 36 + newcomer = 37) */
const ARCHETYPE_MAP = new Map<string, Archetype>();

// Build the map from all lines
for (const line of ARCHETYPE_LINES) {
  ARCHETYPE_MAP.set(line.tiers[1].id, line.tiers[1]);
  ARCHETYPE_MAP.set(line.tiers[2].id, line.tiers[2]);
  ARCHETYPE_MAP.set(line.tiers[3].id, line.tiers[3]);
}
ARCHETYPE_MAP.set(NEWCOMER.id, NEWCOMER);

export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPE_MAP.get(id);
}

// ── Assignment Logic ────────────────────────────────────────────────────────

/**
 * Assign an archetype based on mood history and engagement data.
 * Pure function — no API calls, no Redis. Can be called from client or server.
 *
 * Rules:
 *  - < 3 days played → The Newcomer (not enough data)
 *  - Dominant mood determines the archetype line
 *  - Tier determined by days played: 3-6 = T1, 7-13 = T2, 14+ = T3
 *  - Streak bonus: 7+ streak days auto-tier-up (one tier higher)
 *  - Multi-mood: if two moods tie, pick the one with higher recency weight
 *
 * @param moodHistory  Array of mood keys (e.g. ['happy', 'sad', 'happy', ...])
 * @param streakDays   Current streak count
 * @param daysPlayed   Total unique days played (how many days have mood data)
 */
export function assignArchetype(
  moodHistory: string[],
  streakDays: number,
  daysPlayed: number,
): Archetype {
  // 1. New players haven't established a pattern
  if (daysPlayed < 3) {
    return NEWCOMER;
  }

  // 2. Find dominant mood (with recency weighting — later entries count more)
  const moodCounts = new Map<string, number>();
  for (let i = 0; i < moodHistory.length; i++) {
    const mood = moodHistory[i];
    if (!mood) continue;
    // Recency weight: most recent mood gets highest weight (1.0 → 0.5 decay)
    // Linear decay from 1.0 (most recent) to 0.5 (oldest)
    const recencyWeight = 1.0 - (0.5 * (moodHistory.length - 1 - i) / Math.max(1, moodHistory.length - 1));
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + recencyWeight);
  }

  // Find dominant mood
  let dominantMood = '';
  let maxCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }

  // 3. Find the archetype line for this mood
  let matchedLine: ArchetypeLine | undefined;
  for (const line of ARCHETYPE_LINES) {
    if (line.moodKeys.includes(dominantMood)) {
      matchedLine = line;
      break;
    }
  }

  // Fallback: if mood doesn't match any line (rare edge cases like 'meh', 'cooked', 'nostalgic')
  // map them to closest line
  if (!matchedLine) {
    const fallbackMap: Record<string, string> = {
      meh: 'zen',
      cooked: 'survivor',
      nostalgic: 'dreamer',
      loved: 'heartfelt',
    };
    const fallbackLineId = fallbackMap[dominantMood];
    if (fallbackLineId) {
      matchedLine = ARCHETYPE_LINES.find(l => l.id === fallbackLineId);
    }
    // Ultimate fallback: assign to zen
    if (!matchedLine) {
      matchedLine = ARCHETYPE_LINES.find(l => l.id === 'zen')!;
    }
  }

  // 4. Determine tier from days played
  let tier: 1 | 2 | 3;
  if (daysPlayed >= 14) {
    tier = 3;
  } else if (daysPlayed >= 7) {
    tier = 2;
  } else {
    tier = 1; // 3-6 days
  }

  // 5. Streak bonus: 7+ streak days bumps tier up by one
  if (streakDays >= 7 && tier < 3) {
    tier = (tier + 1) as 1 | 2 | 3;
  }

  return matchedLine.tiers[tier];
}

// ── Evolution Progress ──────────────────────────────────────────────────────

/**
 * Calculate how many days until the next tier evolution.
 * Returns null if already at max tier (3).
 */
export function getEvolutionProgress(
  archetype: Archetype,
  streakDays: number,
  daysPlayed: number,
): { daysUntilEvolve: number; nextTierName: string; progressPct: number } | null {
  if (archetype.tier >= 3) return null;

  const line = ARCHETYPE_LINES.find(l => l.id === archetype.line);
  if (!line) return null;

  const nextTier = (archetype.tier + 1) as 2 | 3;
  const nextArchetype = line.tiers[nextTier];
  if (!nextArchetype) return null;
  const required = nextArchetype.daysRequired;

  // Streak bonus can accelerate: if on 7+ streak, effective tier requirement is lower
  const effectiveRequirement = streakDays >= 7 ? required - 3 : required;
  const daysRemaining = Math.max(0, effectiveRequirement - daysPlayed);
  const progressPct = Math.min(100, Math.round((daysPlayed / effectiveRequirement) * 100));

  return {
    daysUntilEvolve: daysRemaining,
    nextTierName: nextArchetype.name,
    progressPct,
  };
}

// ── Sprite Renderer ─────────────────────────────────────────────────────────

/**
 * Render an archetype sprite as a code-fenced markdown block.
 * Use this when embedding in Reddit comments.
 */
export function renderSpriteMarkdown(archetype: Archetype): string {
  return '```\n' + archetype.sprite + '\n```';
}

/**
 * Get the full list of all archetypes (37 total: 36 from lines + 1 newcomer).
 */
export function getAllArchetypes(): Archetype[] {
  const all: Archetype[] = [NEWCOMER];
  for (const line of ARCHETYPE_LINES) {
    all.push(line.tiers[1]);
    all.push(line.tiers[2]);
    all.push(line.tiers[3]);
  }
  return all;
}

/**
 * Get the archetype line by its ID.
 */
export function getLineById(lineId: string): ArchetypeLine | undefined {
  return ARCHETYPE_LINES.find(l => l.id === lineId);
}
