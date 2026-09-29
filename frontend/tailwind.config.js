export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar modo oscuro basado en clase
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6', // Blue 500
          dark: '#1E40AF',    // Blue 700
          light: '#60A5FA',   // Blue 400
        },
        secondary: '#1E40AF', // Blue 700
        accent: '#60A5FA',    // Blue 400
        success: '#10B981',   // Emerald 500
        warning: '#F59E0B',   // Amber 500
        error: '#EF4444',     // Red 500
        background: '#F8FAFC', // Slate 50
        // Marca (logo): landing, login, registro y dashboard del joven
        brand: {
          amber: '#F9A23B',
          orange: '#F26A2E',
          red: '#DC3340',
          wine: '#8A1C45',
          plum: '#4E0F3A',
          ember: '#C2410F', // inicio del degradado de botones (contraste con texto blanco)
          deep: '#B23A14', // naranja legible sobre fondos claros
        },
        ink: {
          950: '#140B10',
          900: '#1E1218',
          800: '#2A1A22',
        },
        cream: '#FFF8F1',
        sand: {
          50: '#FFF4E8',
          100: '#FDEBDD',
          200: '#F0E2D6',
          300: '#E6D3C4',
        },
        cocoa: {
          400: '#8A6A76',
          500: '#6A5560',
          600: '#4A3840',
          700: '#3A2A30',
          900: '#1F1418',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Oswald', 'Impact', 'Arial Narrow', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        ember: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)', opacity: '0.75' },
          '50%': { transform: 'translate(40px,-30px) scale(1.12)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scroll-wheel': {
          '0%': { opacity: '0', transform: 'translateY(0)' },
          '30%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(12px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.1)', opacity: '0' },
        },
        'dot-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249,162,59,.6)' },
          '70%': { boxShadow: '0 0 0 8px rgba(249,162,59,0)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '60%, 100%': { transform: 'translateX(420%) skewX(-18deg)' },
        },
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(22,163,74,.5)' },
          '70%': { boxShadow: '0 0 0 10px rgba(22,163,74,0)' },
        },
        'scan-line': {
          '0%, 100%': { top: '12%' },
          '50%': { top: '84%' },
        },
      },
      animation: {
        ember: 'ember 12s ease-in-out infinite',
        'ember-slow': 'ember 18s ease-in-out infinite reverse',
        float: 'float 6s ease-in-out infinite',
        'scroll-wheel': 'scroll-wheel 1.8s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.2,.7,.2,1) infinite',
        'pulse-ring-delayed': 'pulse-ring 2.4s cubic-bezier(.2,.7,.2,1) 1.2s infinite',
        'dot-pulse': 'dot-pulse 2.2s ease-out infinite',
        sheen: 'sheen 3.6s ease-in-out infinite',
        'scan-line': 'scan-line 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
