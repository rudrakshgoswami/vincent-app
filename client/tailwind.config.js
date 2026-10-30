/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#FCFCFB', // Ultra-clean paper-like white
                surface: '#F8F7F2',    // Subtle warm surface
                surfaceDark: '#121412', // Richer black
                primary: '#B69A71',    // Deeper Gold
                'primary-dark': '#8E7856',
                'primary-light': '#D4C1A5',
                secondary: '#1A2421',  // Even deeper Forest Green
                accent: '#EBE6DA',     // Warm accent
                text: '#1C1C1C',       // High-quality black
                'text-light': '#FFFFFF',
                'text-muted': '#4A4A4A', // Darker text rendering
                border: '#E8E5DF',
                'border-light': '#F2F1EE',
            },
            fontFamily: {
                heading: ['"DM Serif Display"', 'serif'],
                body: ['"Manrope"', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
                'premium-hover': '0 30px 60px -12px rgba(0, 0, 0, 0.08)',
                'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
            },
            borderRadius: {
                'px': '4px',
                'sm': '6px',
                'md': '10px',
                'lg': '14px',
                'xl': '20px',
                '2xl': '28px',
                'full': '9999px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in': 'slideIn 0.5s ease-out forwards',
                'scale-up': 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleUp: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
