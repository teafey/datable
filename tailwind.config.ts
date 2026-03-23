import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        "bg-base": "var(--bg-base)",
        "bg-subtle": "var(--bg-subtle)",
        "bg-muted": "var(--bg-muted)",

        foreground: "hsl(var(--foreground))",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-disabled": "var(--text-disabled)",

        border: "hsl(var(--border))",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-emphasis": "var(--border-emphasis)",

        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          foreground: "hsl(var(--accent-foreground))",
        },

        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          border: "var(--success-border)",
          text: "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
          border: "var(--warning-border)",
          text: "var(--warning-text)",
        },
        error: {
          DEFAULT: "var(--error)",
          bg: "var(--error-bg)",
          border: "var(--error-border)",
          text: "var(--error-text)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
          border: "var(--info-border)",
          text: "var(--info-text)",
        },

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },

      borderRadius: {
        none: "0px",
        sm: "3px",
        DEFAULT: "5px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },

      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25" }],
        sm: ["0.8125rem", { lineHeight: "1.5" }],
        base: ["0.875rem", { lineHeight: "1.5" }],
        md: ["1rem", { lineHeight: "1.5" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.5rem", { lineHeight: "1.25" }],
        "2xl": ["2rem", { lineHeight: "1.25" }],
      },

      transitionDuration: {
        fast: "100ms",
        normal: "150ms",
        slow: "200ms",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
