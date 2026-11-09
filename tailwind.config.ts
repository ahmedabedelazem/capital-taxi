import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#080808",
        panel: "#141414",
        panel2: "#202020",
        gold: "#FFFFFF",
        muted: "#A3A3A3",
      },
      fontFamily: { sans: ["var(--font-cairo)", "Arial", "sans-serif"] },
      boxShadow: { glow: "0 18px 60px rgba(0,0,0,.22)" },
    },
  },
  plugins: [],
};
export default config;
