module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        /** Overlines / pills (alineado con shell) */
        overline: ["11px", { lineHeight: "1.25", letterSpacing: "0.14em" }],
      },
      boxShadow: {
        nav: "var(--shadow-nav)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-hover)",
      },
      colors: {
        orbita: {
          bg: "var(--color-background)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          border: "var(--color-border)",
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
