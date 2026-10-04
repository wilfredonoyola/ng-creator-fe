import type { Config } from "tailwindcss";

/**
 * El sistema de Clipfine (branding/re-branding y estragias/.../Clipfine-Brand-Package):
 * tinta, blanco y amarillo, sin degradados. Los mismos valores que usa la app
 * (ng-creator-app/src/theme): un cambio va en los dos lados.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ng: {
          fondo: "#0A0A0A",
          hondo: "#050505",
          superficie: "#1C1C1A",
          elevada: "#262624",
          tarjeta: "#1F1F1D",
          // El principal de la marca: el amarillo de Clipfine (desde el 4/10/2026).
          // Los nombres quedan por compatibilidad, los valores ya no son azules.
          azul: "#FFD400",
          // El principal para texto y links sobre fondo oscuro: el mismo amarillo.
          celeste: "#FFD400",
          cian: "#FFD400",
          violeta: "#FFD400",
          lila: "#FFE14D",
          // Lo que está listo, guardado o bien.
          teal: "#3DDC97",
          // La letra sobre el amarillo.
          tinta: "#0A0A0A",
          texto: "#FFFFFF",
          secundario: "#A3A29C",
          tenue: "#6B6A64",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "ng-md": "12px",
        "ng-lg": "16px",
        "ng-xl": "22px",
      },
    },
  },
  plugins: [],
};
export default config;
