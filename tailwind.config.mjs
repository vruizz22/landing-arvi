import animations from '@midudev/tailwind-animations'

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                'arvi-text': '#333333',
                'arvi-background': '#F5F6F7',
                'arvi-primary': '#C3A93C', // amarillo logo
                'arvi-secondary': '#049b3d', // verde logo
                'arvi-accent': '#8ecd20'
            },
            fontFamily: {
                heading: ['Fira Sans', 'sans-serif'],
                body: ['Inter', 'sans-serif']
            }
        }
    },
    plugins: [animations]
}
