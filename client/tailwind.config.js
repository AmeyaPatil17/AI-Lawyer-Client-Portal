/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                primary: {
                    DEFAULT: '#3b82f6',
                    hover: '#2563eb',
                    light: '#bfdbfe',
                    dark: '#1e3a8a',
                },
                success: {
                    DEFAULT: '#10b981',
                    light: '#d1fae5',
                },
                warning: {
                    DEFAULT: '#f59e0b',
                    light: '#fef3c7',
                },
                danger: {
                    DEFAULT: '#ef4444',
                    light: '#fee2e2',
                },
                background: {
                    start: '#0f172a',
                    end: '#1e293b',
                }
            }
        },
    },
    plugins: [],
}
