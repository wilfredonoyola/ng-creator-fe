const createNextIntlPlugin = require("next-intl/plugin");

// El idioma de cada pedido sale de src/i18n/request.ts (docs/IDIOMAS.md).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** El backend, sin /graphql: a donde va todo lo que llega a mcp.clipfine.io. */
const BACKEND = (process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "https://creator-api.ngstudios.co/graphql").replace(/\/graphql\/?$/, "");
/** El conector MCP para ChatGPT y Claude (ng-creator-be#189), con la marca en la dirección. */
const HOST_MCP = "mcp.clipfine.io";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Revival se eliminó: quien tenga /revival guardado vuelve al inicio.
  async redirects() {
    return [{ source: "/revival/:ruta*", destination: "/panel", permanent: false }];
  },
  // mcp.clipfine.io no es una página: Vercel le pasa todo al backend (el
  // conector en la raíz, y OAuth y sus metadatos en su camino), así la URL que
  // se pega en ChatGPT o Claude es de Clipfine y el certificado lo pone Vercel.
  async rewrites() {
    const enMcp = [{ type: "host", value: HOST_MCP }];
    return {
      beforeFiles: [
        { source: "/", has: enMcp, destination: `${BACKEND}/mcp` },
        { source: "/:camino*", has: enMcp, destination: `${BACKEND}/:camino*` },
      ],
    };
  },
};
module.exports = withNextIntl(nextConfig);
