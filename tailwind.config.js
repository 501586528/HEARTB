import { nextui } from "@nextui-org/theme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      addCommonColors: true,
      themes: {
        light: {
          colors: {
            themePink: {
              DEFAULT: "#FB729A",
              flat: "rgba(251, 114, 154, 0.2)",
              80: "rgba(251, 114, 154, 0.8)",
              foreground: "#ffffff",
              gradient: "#FF9EAA",
            },
            themeBlue: {
              DEFAULT: "#00AEEC",
              flat: "rgba(0, 174, 236, 0.2)",
              10: "rgba(0, 174, 236, 0.1)",
              foreground: "#ffffff",
              gradient: "#42C2FF",
            },
            gray: {
              50: "#F9FAFB",
              100: "#F3F4F6",
              200: "#E5E7EB",
              300: "#D1D5DB",
              400: "#9CA3AF",
              500: "#6B7280",
              600: "#4B5563",
              700: "#374151",
              800: "#1F2937",
              900: "#111827",
              950: "#030712",
            },
            slate: {
              50: "#F8FAFC",
              100: "#F1F5F9",
              200: "#E2E8F0",
              300: "#CBD5E1",
              400: "#94A3B8",
              500: "#64748B",
              600: "#475569",
              700: "#334155",
              800: "#1E293B",
              900: "#0F172A",
              950: "#020617",
            },
            blue: { 50: "#EFF6FF" },
          },
        },
        dark: {
          extend: "dark",
          colors: {
            themePink: {
              DEFAULT: "#FB729A", // Adjust this as needed for dark mode
              flat: "rgba(251, 114, 154, 0.2)",
              80: "rgba(251, 114, 154, 0.8)",
              foreground: "#ffffff",
              gradient: "#FF9EAA",
            },
            themeBlue: {
              DEFAULT: "#00AEEC",
              flat: "rgba(0, 174, 236, 0.2)",
              10: "rgba(0, 174, 236, 0.1)",
              foreground: "#ffffff",
              gradient: "#30A2FF",
            },
            gray: {
              50: "#030712",
              100: "#111827",
              200: "#1F2937",
              300: "#374151",
              400: "#4B5563",
              500: "#6B7280",
              600: "#9CA3AF",
              700: "#D1D5DB",
              800: "#E5E7EB",
              900: "#F3F4F6",
              950: "#F9FAFB",
            },
            slate: {
              50: "#020617",
              100: "#0F172A",
              200: "#1E293B",
              300: "#334155",
              400: "#475569",
              500: "#64748B",
              600: "#94A3B8",
              700: "#CBD5E1",
              800: "#E2E8F0",
              900: "#F1F5F9",
              950: "#F8FAFC",
            },
            blue: { 50: "#172554" },
          },
        },
      },
    }),
  ],
};
