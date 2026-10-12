import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    DEFAULT: '#14433b',
                    50: '#f0f7f5',
                    100: '#dbeee8',
                    200: '#b8ded3',
                    300: '#8cc5b6',
                    400: '#5fa795',
                    500: '#3f8b79',
                    600: '#2d6e60',
                    700: '#23574c',
                    800: '#1c473e',
                    900: '#14433b', // Brand Dark Green
                    950: '#0b2621',
                },
                accent: {
                    DEFAULT: '#21c9a4',
                    50: '#effcf8',
                    100: '#d5f8ee',
                    200: '#aff0de',
                    300: '#7ae4cb',
                    400: '#43d0b2',
                    500: '#21c9a4', // Brand Accent Mint
                    600: '#14967a',
                    700: '#147662',
                    800: '#145e4f',
                    900: '#144e42',
                },
            },
        },
    },

    plugins: [forms],
};
