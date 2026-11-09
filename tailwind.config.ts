import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#F5F7F2",
        panel: "#FFFFFF",
        panel2: "#EEF2E9",
        gold: "#8CC63F",
        muted: "#66705E",
        brand: "#8CC63F",
        "brand-dark": "#5E8F25",
      },
      fontFamily: { sans: ["var(--font-cairo)", "Arial", "sans-serif"] },
      boxShadow: { glow: "0 18px 60px rgba(72,108,36,.12)" },
    },
  },
  plugins: [],
};
export default config;
