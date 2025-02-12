/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/flowbite/**/*.js',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      screens: {
        plus: '320px',
        tablet: '576px',
        laptop: '1024px',
        desktop: '1280px',
        widescreen: '1536px',
      },
      boxShadow: {
        light: '0 20px 30px rgba(0, 0, 0, 0.2)',
        heavy: '0 22px 70px 4px rgba(0, 0, 0, 0.56)',
        centered:
          '0px 4px 16px rgba(17, 17, 26, 0.1), 0px 8px 24px rgba(17, 17, 26, 0.1), 0px 16px 56px rgba(17, 17, 26, 0.1)',
        'centered-light': '0px 0px 16px rgba(17, 17, 26, 0.1)',
        inner: 'rgba(50, 50, 93, 0.25) 0px 30px 60px -12px inset, rgba(0, 0, 0, 0.3) 0px 18px 36px -18px inset',
        'inner-light': 'rgba(50, 50, 93, 0.25) 0px 15px 30px -6px inset, rgba(0, 0, 0, 0.3) 0px 9px 18px -9px inset',
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
    require('flowbite/plugin'),
    require('tailwindcss-animated'),
    require('@tailwindcss/typography'),
  ],
};
