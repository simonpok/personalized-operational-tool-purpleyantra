/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "var(--bg-primary)",
        card: "var(--bg-card)",
        accentBlue: "var(--accent-blue)",
        accentGreen: "var(--accent-green)",
        accentAmber: "var(--accent-amber)",
        accentRed: "var(--accent-red)",
        truT: "var(--tru-T)",
        truR: "var(--tru-R)",
        truU: "var(--tru-U)",
        primaryText: "var(--text-primary)",
        mutedText: "var(--text-muted)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
