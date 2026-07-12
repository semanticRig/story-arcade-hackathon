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
