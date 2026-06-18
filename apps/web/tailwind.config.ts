import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        reactor: "#40f5ff",
        ember: "#ffb86b",
        graphite: "#090d12",
        panel: "#101820"
      },
      boxShadow: {
        hud: "0 0 0 1px rgba(64,245,255,.24), 0 24px 80px rgba(0,0,0,.35)"
      }
    }
  },
  plugins: []
};

export default config;
