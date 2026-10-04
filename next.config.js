const createNextIntlPlugin = require("next-intl/plugin");

// El idioma de cada pedido sale de src/i18n/request.ts (docs/IDIOMAS.md).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = withNextIntl(nextConfig);
