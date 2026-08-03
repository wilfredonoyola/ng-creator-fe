import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Genera tipos TypeScript desde el schema del backend.
 * Correr con: npm run codegen (con el backend corriendo en :4000)
 */
const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql",
  documents: ["src/**/*.{ts,tsx}"],
  generates: {
    "./src/generated/": {
      preset: "client",
      plugins: [],
    },
  },
};
export default config;
