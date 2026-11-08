import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"], theme: { extend: { colors: { night: "#0B0F16", panel: "#141D2B", panel2: "#1C2738", gold: "#D5AE63", muted: "#9AA7B8" }, fontFamily: { sans: ["var(--font-cairo)", "Arial", "sans-serif"] }, boxShadow: { glow: "0 0 50px rgba(213,174,99,.12)" } } }, plugins: [] };
export default config;
