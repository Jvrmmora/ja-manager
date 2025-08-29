export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
