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
      {
        corporate: {
          "--color-base-100": "#FFFFFF",
          "--color-base-200": "#F3F4F9",
          "--color-base-300": "#E5E7EF",
          "--color-base-content": "#363C4F",
          "--color-primary": "#3559E0",
          "--color-primary-content": "#FFFFFF",
          "--color-secondary": "#AAB0C0",
          "--color-secondary-content": "#FFFFFF",
          "--color-accent": "#2FA4D7",
          "--color-accent-content": "#FFFFFF",
          "--color-neutral": "#3A4256",
          "--color-neutral-content": "#FFFFFF",
          "--color-info": "#2FA4D7",
          "--color-info-content": "#FFFFFF",
          "--color-success": "#6CC261",
          "--color-success-content": "#FFFFFF",
          "--color-warning": "#FBC756",
          "--color-warning-content": "#FFFFFF",
          "--color-error": "#E9686A",
          "--color-error-content": "#FFFFFF",
          "--radius-selector": "0.5rem"
        },
      },
      "light",
      "dracula"
    ],
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: false,
    themeRoot: ":root",
  },
};