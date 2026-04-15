import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#EDEDED",
        secondary: "#A1A1A1",
        accent: "#00C853",
        background: "#050505",
        surface: "#0F0F0F",
        "surface-bright": "#1A1A1A",
        border: "#1F1F1F",
        "border-bright": "#2A2A2A",
        muted: "#525252",
        danger: "#EF4444",
        success: "#22C55E",
        sidebar: "#080808",
        "sidebar-border": "#1F1F1F",
        "sidebar-hover": "#141414",
        "sidebar-active": "#141414",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-up-d1": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
        "fade-up-d2": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards",
        "fade-up-d3": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
        "fade-up-d4": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards",
        "fade-in": "fade-in 1s ease forwards",
        shimmer: "shimmer 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
