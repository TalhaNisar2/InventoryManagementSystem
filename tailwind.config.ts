import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12141F",
          soft: "#1B1E2E",
          line: "#2A2E42",
        },
        paper: "#F3F4F7",
        surface: "#FFFFFF",
        accent: {
          DEFAULT: "#C97A24",
          soft: "#F4E3CB",
          dim: "#8A5518",
        },
        success: {
          DEFAULT: "#1F9D6C",
          soft: "#DCF2E7",
        },
        danger: {
          DEFAULT: "#C6432F",
          soft: "#F8DFDA",
        },
        warn: {
          DEFAULT: "#B4860B",
          soft: "#F5E9C8",
        },
        muted: "#6B7080",
        line: "#E4E5EA",
      },
      fontFamily: {
        display: [
          '"Avenir Next"',
          '"Century Gothic"',
          '"Segoe UI"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        sans: [
          '-apple-system',
          '"Segoe UI"',
          "system-ui",
          '"Helvetica Neue"',
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,20,31,0.04), 0 1px 0 rgba(18,20,31,0.03)",
        pop: "0 12px 28px rgba(18,20,31,0.10)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-in": "slide-in 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
