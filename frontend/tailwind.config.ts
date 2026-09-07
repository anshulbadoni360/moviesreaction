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
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
        },
        neutral: {
          DEFAULT: "#9C9C9C",
        },
        bg: {
          DEFAULT: "#FAFAFA",
        },
        surface: {
          DEFAULT: "#FFFFFF",
        },
        text: {
          primary: "#0A0A0A",
          secondary: "#6B6B6B",
        },
        border: {
          DEFAULT: "#E8E8EC",
          subtle: "#E8E8EC",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      fontFamily: {
        display: ["'General Sans'", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        tag: "4px",
        btn: "6px",
        panel: "8px",
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.02)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.08)",
        "btn-glow": "0 4px 12px rgba(99,102,241,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
