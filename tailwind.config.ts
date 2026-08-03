import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        marca: {
          verde: "#0FED9D",
          blanco: "#FCFBFC",
          negro: "#000000",
        },
      },
    },
  },
  plugins: [],
};
export default config;
