import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cyberpunk color palette
                cyber: {
                    pink: "#FF006E",
                    purple: "#8338EC",
                    blue: "#3A86FF",
                    cyan: "#00F5FF",
                    green: "#06FFA5",
                    yellow: "#FFBE0B",
                    orange: "#FB5607",
                },
                neon: {
                    pink: "#FF10F0",
                    blue: "#00D9FF",
                    green: "#39FF14",
                    purple: "#BC13FE",
                    yellow: "#FFFF00",
                },
                dark: {
                    900: "#0A0A0F",
                    800: "#121218",
                    700: "#1A1A24",
                    600: "#232330",
                    500: "#2D2D3D",
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
                display: ["var(--font-orbitron)", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "cyber-grid": "linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)",
            },
            animation: {
                "glow": "glow 2s ease-in-out infinite alternate",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "scan": "scan 8s linear infinite",
                "flicker": "flicker 3s linear infinite",
            },
            keyframes: {
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(0, 245, 255, 0.5), 0 0 10px rgba(0, 245, 255, 0.3)" },
                    "100%": { boxShadow: "0 0 20px rgba(0, 245, 255, 0.8), 0 0 30px rgba(0, 245, 255, 0.5)" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                scan: {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100%)" },
                },
                flicker: {
                    "0%, 100%": { opacity: "1" },
                    "41.99%": { opacity: "1" },
                    "42%": { opacity: "0" },
                    "43%": { opacity: "0" },
                    "43.01%": { opacity: "1" },
                    "47.99%": { opacity: "1" },
                    "48%": { opacity: "0" },
                    "49%": { opacity: "0" },
                    "49.01%": { opacity: "1" },
                },
            },
            boxShadow: {
                "neon-pink": "0 0 10px rgba(255, 16, 240, 0.5), 0 0 20px rgba(255, 16, 240, 0.3), 0 0 30px rgba(255, 16, 240, 0.1)",
                "neon-blue": "0 0 10px rgba(0, 217, 255, 0.5), 0 0 20px rgba(0, 217, 255, 0.3), 0 0 30px rgba(0, 217, 255, 0.1)",
                "neon-green": "0 0 10px rgba(57, 255, 20, 0.5), 0 0 20px rgba(57, 255, 20, 0.3), 0 0 30px rgba(57, 255, 20, 0.1)",
                "neon-purple": "0 0 10px rgba(188, 19, 254, 0.5), 0 0 20px rgba(188, 19, 254, 0.3), 0 0 30px rgba(188, 19, 254, 0.1)",
            },
            backdropBlur: {
                xs: "2px",
            },
        },
    },
    plugins: [],
};

export default config;
