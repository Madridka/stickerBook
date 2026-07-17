import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      animation: {
        'album-page-turn-backward':
          'album-page-turn-backward 420ms cubic-bezier(0.22, 0.72, 0.22, 1) both',
        'album-page-turn-forward':
          'album-page-turn-forward 420ms cubic-bezier(0.22, 0.72, 0.22, 1) both',
        'click-effect': 'click-effect 700ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
        'target-pulse': 'target-pulse 950ms ease-in-out infinite alternate',
      },
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        coral: 'rgb(var(--color-coral) / <alpha-value>)',
        mint: 'rgb(var(--color-mint) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      keyframes: {
        'album-page-turn-backward': {
          from: { transform: 'rotateY(100deg)' },
          to: { transform: 'rotateY(0deg)' },
        },
        'album-page-turn-forward': {
          from: { transform: 'rotateY(-100deg)' },
          to: { transform: 'rotateY(0deg)' },
        },
        'click-effect': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(0.8)' },
          to: { opacity: '0', transform: 'translate(-50%, -145%) scale(1.15)' },
        },
        'target-pulse': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.055)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
