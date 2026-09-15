/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clickup: {
          bg: '#1e1f21',
          card: '#2a2b2d',
          sidebar: '#18191b',
          border: '#333538',
          hover: '#383a3e',
          active: '#45484d',
          purple: '#7b68ee',
          purpleHover: '#6a55e0',
          green: '#26b26d',
          blue: '#1e88e5',
          red: '#e2483d',
          yellow: '#f59e0b',
          textMuted: '#8c8f94',
          textMain: '#ececef'
        }
      }
    },
  },
  plugins: [],
};
