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
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'light', 
      'dark',
      {
        modern: {
          "color-scheme": "light",
          "color-base-100": "hsl(0, 0%, 100%)",
          "color-base-200": "hsl(220, 20%, 97%)",
          "color-base-300": "hsl(220, 15%, 94%)",
          "color-base-content": "hsl(220, 20%, 25%)",
          "color-primary": "hsl(210, 100%, 50%)",
          "color-primary-content": "hsl(0, 0%, 100%)",
          "color-secondary": "hsl(210, 30%, 30%)",
          "color-secondary-content": "hsl(0, 0%, 100%)",
          "color-accent": "hsl(150, 60%, 50%)",
          "color-accent-content": "hsl(150, 100%, 15%)",
          "color-neutral": "hsl(220, 10%, 30%)",
          "color-neutral-content": "hsl(220, 10%, 95%)",
          "color-info": "hsl(210, 80%, 60%)",
          "color-info-content": "hsl(210, 80%, 15%)",
          "color-success": "hsl(150, 70%, 45%)",
          "color-success-content": "hsl(150, 70%, 15%)",
          "color-warning": "hsl(40, 90%, 60%)",
          "color-warning-content": "hsl(40, 90%, 15%)",
          "color-error": "hsl(0, 80%, 60%)",
          "color-error-content": "hsl(0, 80%, 15%)",
          "--radius-selector": "0.5rem",
          "--radius-field": "0.375rem",
          "--radius-box": "0.75rem",
          "--size-selector": "0.2rem",
          "--size-field": "0.2rem",
          "--border": "1px",
          "--depth": "1",
          "--noise": "0"
        },
        silk: {
          "color-scheme": "light",
          "color-base-100": "oklch(97% 0.0035 67.78)",
          "color-base-200": "oklch(95% 0.0081 61.42)",
          "color-base-300": "oklch(90% 0.0081 61.42)",
          "color-base-content": "oklch(40% 0.0081 61.42)",
          "color-primary": "oklch(23.27% 0.0249 284.3)",
          "color-primary-content": "oklch(94.22% 0.2505 117.44)",
          "color-secondary": "oklch(23.27% 0.0249 284.3)",
          "color-secondary-content": "oklch(73.92% 0.2135 50.94)",
          "color-accent": "oklch(23.27% 0.0249 284.3)",
          "color-accent-content": "oklch(88.92% 0.2061 189.9)",
          "color-neutral": "oklch(20% 0 0)",
          "color-neutral-content": "oklch(80% 0.0081 61.42)",
          "color-info": "oklch(80.39% 0.1148 241.68)",
          "color-info-content": "oklch(30.39% 0.1148 241.68)",
          "color-success": "oklch(83.92% 0.0901 136.87)",
          "color-success-content": "oklch(23.92% 0.0901 136.87)",
          "color-warning": "oklch(83.92% 0.1085 80)",
          "color-warning-content": "oklch(43.92% 0.1085 80)",
          "color-error": "oklch(75.1% 0.1814 22.37)",
          "color-error-content": "oklch(35.1% 0.1814 22.37)",
          "--radius-selector": "2rem",
          "--radius-field": "0.5rem",
          "--radius-box": "1rem",
          "--size-selector": "0.25rem",
          "--size-field": "0.25rem",
          "--border": "2px",
          "--depth": "1",
          "--noise": "0"
        }
      }
    ],
  },
};