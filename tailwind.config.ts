import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'carbon-950': '#0D1117',
        'carbon-900': '#161B22',
        'carbon-800': '#1F2630',
        line: '#262B33',
        phosphor: '#00FF66',
        'phosphor-dim': '#003B1A',
        amber: '#FF9900',
        threat: '#FF3333',
        friend: '#00CCFF',
        unknown: '#FFCC00',
        'text-main': '#C9D1D9',
        'text-dim': '#7D8590',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Chakra Petch"', 'sans-serif'],
        clock: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
