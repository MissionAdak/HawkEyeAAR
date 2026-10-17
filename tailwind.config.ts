import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#0D1117',
          900: '#161B22',
          800: '#1F2630',
        },
        line: '#262B33',
        phosphor: {
          DEFAULT: '#00FF66',
          dim: '#003B1A',
        },
        amber: {
          DEFAULT: '#FF9900',
        },
        threat: '#FF3333',
        friend: '#00CCFF',
        unknown: '#FFCC00',
        text: {
          DEFAULT: '#C9D1D9',
          dim: '#7D8590',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        chakra: ['"Chakra Petch"', 'sans-serif'],
        share: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
