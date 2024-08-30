export const themes = ["dark", "light", "nollningPostReveal"] as const;
export type Theme = (typeof themes)[number];

const nollningPostRevealTheme = {
  primary: "#FF5BB8",
  secondary: "#BD93F9",
  neutral: "#6272A4",
  accent: "#ffdb77",
  background: "#460038",
  "base-100": "#282A36",
  "base-200": "#44475A",
  "base-content": "#F8F8F2",

  info: "#3abff8",
  success: "#33473f",
  warning: "#fbbd23",
  error: "#FF88DC",
};

export const Colors = {
  nollningPostReveal: nollningPostRevealTheme,
  light: { ...nollningPostRevealTheme },
  dark: { ...nollningPostRevealTheme },
};