export const MOOD_OPTIONS = [
  { key: 'happy', emoji: '😊', label: "I'm on top of the world" },
  { key: 'sad', emoji: '😔', label: "I'm a hot mess" },
  { key: 'angry', emoji: '😡', label: "I'm low-key furious" },
  { key: 'excited', emoji: '🤩', label: "I'm hella hyped" },
  { key: 'tired', emoji: '😴', label: "I'm running on fumes" },
] as const;

export const HOT_TAKE_BUTTON_STYLES = {
  agree: 'bg-green-600 hover:bg-green-700',
  disagree: 'bg-red-600 hover:bg-red-700',
  unsure: 'bg-gray-500 hover:bg-gray-600',
} as const;

export const CANVAS_PALETTE = [
  '#1a1a1a', '#ffffff', '#ff4444', '#ff8800', '#ffdd00',
  '#44cc44', '#00cccc', '#4488ff', '#8844ff', '#ff44aa',
  '#885533', '#888888',
] as const;

// Pro Brain [M3]: Single source of truth — was duplicated in commentFormat.ts and WeeklyRecapCard.tsx
export const PERSONALITY_DESCRIPTIONS: Record<string, string> = {
  'The Optimist': 'You see the bright side — even when things are on fire.',
  'The Radiant Regular': 'You show up with good vibes every single day. Legendary.',
  'The Deep Thinker': 'You feel things deeply. That\'s a superpower, not a weakness.',
  'The Brooding Mastermind': 'Brooding with a plan. You\'re 3 steps ahead of everyone.',
  'The Firebrand': 'You\'ve got passion. Channel it into something unstoppable.',
  'The Fired Up': 'You came back angry and you came to win. Respect.',
  'The Enthusiast': 'Your energy is contagious. Never let anyone dim it.',
  'The Hype Architect': 'You don\'t just bring hype — you build it from the ground up.',
  'The Survivor': 'You\'re still standing. That counts for everything.',
  'The Committed Exhausted': 'Tired but here. That\'s the definition of dedication.',
  'The Spiral Surfer': 'You ride the waves of anxiety like a pro. Somehow.',
  'The Zen Master': 'Unbothered. Moisturized. In your lane. Thriving.',
  'The Gremlin': 'Chaos is a ladder, and you\'re climbing it.',
  'The Dreamer': 'Manifesting, believing, achieving. The whole package.',
  'The Believer': 'You keep the faith. Even when the wifi drops.',
  'The Indifferent': 'You\'re just here to vibe. No notes.',
  'The Heartfelt': 'Out here catching feelings and winning hearts.',
  'The Well-Done': 'You\'ve been through it. Came out seasoned.',
  'The Time Traveler': 'Living in the past? It\'s called ✨aesthetic✨.',
  'The Explorer': 'New experiences or bust. You\'re gonna need a bigger passport.',
  'The Completionist': '7 out of 7 days. You don\'t miss. Ever.',
  'The Story Arcadian': 'You\'re writing your own story. Keep going.',
  'The Newcomer': 'Fresh meat. We love to see it.',
};
