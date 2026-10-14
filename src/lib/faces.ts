/* Faces set in flap cards. Five tiles wide so they fit any board row. */

export const FACES = {
  calm: "(^_^)",
  glad: "(^o^)",
  wink: "(^_~)",
  watch: "(o_o)",
  left: "(<_<)",
  right: "(>_>)",
  sleepy: "(-_-)",
  blink: "(-_-)",
  side: "(¬_¬)",
  alarm: "(O_O)",
  stars: "(*_*)",
  sad: "(;_;)",
  done: "(x_x)",
  focus: "(•_•)",
} as const;

export type Mood = keyof typeof FACES;

/* Wide faces for boards with seven tiles to spare. */
export const WIDE = {
  cheer: "\\(^o^)/",
  calm: " (^_^) ",
  watch: " (o_o) ",
  lookL: "(o_o)  ",
  lookR: "  (o_o)",
  sleepy: " (-_-)z",
  side: " (¬_¬) ",
  alarm: " (O_O) ",
  stars: " (*_*) ",
  wink: " (^_~) ",
  sad: " (;_;) ",
  focus: " (•_•) ",
  curious: " (°o°) ",
  glad: " (^o^) ",
  done: " (x_x) ",
} as const;

export type WideMood = keyof typeof WIDE;
