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
        modern: {
          "primary": "hsl(230, 85%, 53%)", // Bright blue
          "primary-focus": "hsl(230, 85%, 45%)", // Darker blue for focus states
          "primary-content": "hsl(0, 0%, 100%)", // White text on primary
          
          "base-100": "hsl(0, 0%, 100%)", // Pure white
          "base-200": "hsl(220, 20%, 97%)", // Very light gray with blue tint
          "base-300": "hsl(220, 15%, 94%)", // Light gray with blue tint
          "base-content": "hsl(220, 20%, 25%)", // Dark blue-gray for text
          
          "secondary": "hsl(210, 30%, 30%)", // Blue-gray
          "secondary-content": "hsl(0, 0%, 100%)", // White text on secondary
          
          "accent": "hsl(160, 84%, 39%)", // Green
          "accent-content": "hsl(160, 84%, 8%)", // Dark green text
          
          "neutral": "hsl(220, 10%, 30%)", // Neutral gray
          "neutral-content": "hsl(220, 10%, 95%)", // Light text on neutral
          
          "info": "hsl(210, 90%, 57%)", // Blue
          "info-content": "hsl(210, 90%, 15%)", // Dark blue text
          
          "success": "hsl(160, 84%, 39%)", // Green
          "success-content": "hsl(160, 84%, 8%)", // Dark green text
          
          "warning": "hsl(40, 95%, 50%)", // Amber
          "warning-content": "hsl(40, 95%, 13%)", // Dark amber text
          
          "error": "hsl(0, 85%, 60%)", // Red
          "error-content": "hsl(0, 85%, 15%)", // Dark red text
          
          "--rounded-box": "0.75rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "0.375rem",
          "--animation-btn": "0.2s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.95",
          "--border-btn": "1px",
          "--tab-radius": "0.5rem",
        },
      },
      "light",
      "dark"
    ],
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: false,
    themeRoot: ":root",
  },
};