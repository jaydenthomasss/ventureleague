import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#111111",
          foreground: "#ffffff",
        },
        border: "#1f1f1f",
        input: "#1f1f1f",
        ring: "#E8A045",
        primary: {
          DEFAULT: "#E8A045",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#4A9EFF",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#1a1a1a",
          foreground: "#9ca3af",
        },
        accent: {
          DEFAULT: "#E8A045",
          foreground: "#0a0a0a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#0a0a0a",
        },
        amber: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          DEFAULT: "#E8A045",
        },
        blue: {
          DEFAULT: "#4A9EFF",
        },
        gray: {
          900: "#111111",
          800: "#1a1a1a",
          700: "#2a2a2a",
          600: "#3a3a3a",
          500: "#6b7280",
          400: "#9ca3af",
          300: "#d1d5db",
          200: "#e5e7eb",
          100: "#f3f4f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        mono: ["var(--font-mono)", "Fira Code", ...fontFamily.mono],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-amber": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232, 160, 69, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(232, 160, 69, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "rank-up": {
          "0%": { backgroundColor: "rgba(34, 197, 94, 0.2)" },
          "100%": { backgroundColor: "transparent" },
        },
        "rank-down": {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0.2)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "pulse-amber": "pulse-amber 2s infinite",
        shimmer: "shimmer 2s infinite linear",
        "rank-up": "rank-up 2s ease-out",
        "rank-down": "rank-down 2s ease-out",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "card-gradient":
          "linear-gradient(135deg, #111111 0%, #161616 100%)",
        "amber-gradient":
          "linear-gradient(135deg, #E8A045 0%, #d4843a 100%)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(232,160,69,0.1) 50%, transparent 100%)",
      },
      boxShadow: {
        "amber-glow": "0 0 20px rgba(232, 160, 69, 0.15)",
        "blue-glow": "0 0 20px rgba(74, 158, 255, 0.15)",
        card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
