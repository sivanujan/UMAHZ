export default {
  darkMode: 'class',
  content: [
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
    './storage/framework/views/*.php',
    './resources/views/**/*.blade.php',
    './resources/js/**/*.jsx',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          muted: 'var(--color-surface-muted)',
        },
        ink: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        accent: {
          violet: 'var(--color-accent-violet)',
          'violet-hover': 'var(--color-accent-violet-hover)',
          pink: 'var(--color-accent-pink)',
          teal: 'var(--color-accent-teal)',
        },
        brand: {
          DEFAULT: '#8200db',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        aurora: {
          base: '#FBF7FD',
          violet: '#F3E8FF',
          lavender: '#E9D5FF',
          magenta: '#FBE7F3',
          indigo: '#E5E7FF',
          neutral: '#FBF7FD',
          'dark-base': '#0E0B14',
          'dark-end': '#16101F',
          'dark-brand': 'rgba(130, 0, 219, 0.20)',
          'dark-indigo': '#3B2A6B',
          'dark-magenta': '#5B1E52',
          'dark-card': 'rgba(30, 24, 45, 0.5)',
        },
        warm: {
          50: '#fcfbf9',
          100: '#f5f3ef',
          200: '#e8e4dc',
          800: '#292524',
        },
      },
    },
  },
  plugins: [],
};
