/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo
          hover: '#4338CA',
          light: '#EEF2FF',
        },
        sidebar: {
          bg: '#0F172A', // Dark Slate
          hover: '#1E293B',
          text: '#94A3B8',
          active: '#4F46E5',
        },
        accent: {
          teal: '#14B8A6',
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        card: '#FFFFFF',
        background: '#F8FAFC',
      },
    },
  },
  plugins: [],
};
