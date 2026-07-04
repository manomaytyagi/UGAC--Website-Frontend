// Shared application color tokens. Keep page-level styles pointed here so a
// palette change only needs to be made once.
export const COLORS = Object.freeze({
  navyDeep: "#0d1b3e",
  navyMid: "#1e3a6e",
  navyLight: "#2e509e",
  orange: "#ee9116",
  white: "#ffffff",
  offWhite: "#edebe7",
  border: "#dce3f0",
  textMuted: "#5a6a8a",
  textDim: "#8a9abc",
  ink: "#101935",
});

// The feedback flow uses a slightly brighter accent and background while
// sharing the rest of the application palette.
export const FEEDBACK_COLORS = Object.freeze({
  ...COLORS,
  orange: "#f97316",
  orangeSoft: "#fed7aa",
  offWhite: "#f5f7fc",
  error: "#dc2626",
  success: "#16a34a",
});
