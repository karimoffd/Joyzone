// Restores the theme that index.html used to load from the Tailwind CDN.
// Utility classes (flex, grid, min-[900px]:..., bg-joyOrange) are used across
// the auth screens and shared UI, so they must be generated at build time.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        joyBlue: "#294A6D",
        joyDeep: "#12283F",
        joyCream: "#F6F1EE",
        joyOrange: "#E46630",
      },
      boxShadow: {
        panel: "0 28px 80px rgba(11, 24, 38, 0.42)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
