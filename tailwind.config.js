/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      colors: {
        'primary': 'hsl(230, 85%, 53%)', // Bright blue using HSL
      }
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      // Corporate theme (custom)
      {
        corporate: {
          primary: "#3559E0",
          "primary-content": "#FFFFFF",
          secondary: "#AAB0C0",
          "secondary-content": "#FFFFFF",
          accent: "#2FA4D7",
          "accent-content": "#FFFFFF",
          neutral: "#3A4256",
          "neutral-content": "#FFFFFF",

          // Status colours
          info: "#2FA4D7",
          success: "#6CC261",
          warning: "#FBC756",
          error: "#E9686A",

          // Background levels
          "base-100": "#FFFFFF",
          "base-200": "#F3F4F9",
          "base-300": "#E5E7EF",
          "base-content": "#363C4F",
        },
      },

      // Light theme override – only change what we need (background greys)
      {
        light: {
          "base-100": "oklch(92% 0.004 286.32)", // page background
          "base-200": "oklch(96% 0.003 264.542)", // cards / secondary panels
          "base-300": "#1a3e87", // borders / subtle fills
          "base-content": "#1f2937", // text
        },
      },

      // Built-in Dracula theme
      "dracula",
    ],
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: false,
    themeRoot: ":root",
  },
};