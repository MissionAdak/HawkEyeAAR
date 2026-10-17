/**
 * DRISHTI-CUAS Tactical C2 Palette
 *
 * Source: DESIGN.md Section 1.1
 * Contrast ratios confirmed for 4.5:1 WCAG compliance on carbon-900.
 */

export const PALETTE = {
  carbon: {
    950: '#0D1117', // Page background, radar background
    900: '#161B22', // Panel background
    800: '#1F2630', // Table row alt, input fill
  },
  line: '#262B33', // 1 px border for all panels
  phosphor: {
    DEFAULT: '#00FF66', // Radar sweep, rings text, primary data, healthy state
    dim: '#003B1A', // Range rings, grid, afterglow tail, inactive pills
  },
  amber: '#FF9900', // Warning, degraded sensor, kinetic tier, IR HUD
  threat: '#FF3333', // Hostile symbols, ROE violation, LEAK, missile tier
  friend: '#00CCFF', // Friendly symbols, selected-track bracket
  unknown: '#FFCC00', // Unclassified track "?"
  text: {
    DEFAULT: '#C9D1D9', // Body text
    dim: '#7D8590', // Label text
  },
} as const;
