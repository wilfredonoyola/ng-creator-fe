import type { Config } from "tailwindcss";

/**
 * El sistema de NG Creator (branding/NG_CREATOR_BRAND_AND_APP_SYSTEM.md). Los
 * mismos valores que usa la app (ng-creator-app/src/theme): un cambio va en
 * los dos lados.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ng: {
          fondo: "#0B0F1A",
          hondo: "#070A12",
          superficie: "#111827",
          elevada: "#161D2E",
          tarjeta: "#121827",
          // El principal de la marca (desde el 1/10/2026, rosa → violeta): los
          // nombres quedan por compatibilidad, los valores ya no son azules.
          azul: "#A855F7",
          // El principal, más claro para texto y links sobre fondo oscuro.
          celeste: "#C084FC",
          // El arranque del degradado de la marca.
          cian: "#F43F8E",
          violeta: "#8B5CF6",
          lila: "#A78BFA",
          // Lo que está listo, guardado o bien: el verde de antes pasa a teal.
          teal: "#14D8C4",
          texto: "#F8FAFC",
          secundario: "#94A3B8",
          tenue: "#64748B",
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
