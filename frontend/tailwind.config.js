/** @type {import('tailwindcss').Config} */
// Tailwind v4 recommends the new config preset format, but export default object still works.
// We ensure darkMode:'class' and widen content globs to avoid missed classes during JIT.
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    // Add any other potential JSX/TSX locations (safety for monorepo or moved files)
    '../frontend/index.html',
    '../frontend/src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
