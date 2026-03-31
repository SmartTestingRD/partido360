/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        'gap-4', 'gap-6', 'gap-8',
        'p-4', 'p-5', 'p-6', 'p-8',
        'mb-2', 'mb-3', 'mb-4', 'mb-6', 'mb-8',
        'mt-1', 'mt-2', 'mt-4', 'mt-6',
        'space-y-4', 'space-y-6', 'space-y-8',
        'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4',
        'col-span-1', 'col-span-2', 'col-span-3',
        'rounded-2xl', 'rounded-xl',
        'pb-8', 'pb-24',
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#2563EB",
                secondary: "#EFF6FF",
                "background-light": "#F3F4F6",
                "background-dark": "#111827",
                "card-light": "#FFFFFF",
                "card-dark": "#1F2937",
                "text-light": "#111827",
                "text-dark": "#F9FAFB",
                "border-light": "#E5E7EB",
                "border-dark": "#374151",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'glass': '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
            }
        },
    },
    plugins: [],
}
