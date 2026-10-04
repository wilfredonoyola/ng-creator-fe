#!/usr/bin/env node
/**
 * Arma src/messages/index.ts con todos los archivos de src/messages/{es,en}
 * y revisa que los dos idiomas tengan exactamente las mismas claves. Corre
 * solo antes de `dev` y de `build`; a mano: `npm run mensajes`.
 *
 * Un archivo por pantalla o componente (su "namespace"): así dos cambios en
 * pantallas distintas no se pisan en un JSON gigante.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "messages");
const IDIOMAS = ["es", "en"];

const archivos = Object.fromEntries(
  IDIOMAS.map((i) => [i, readdirSync(join(raiz, i)).filter((f) => f.endsWith(".json")).sort()]),
);

const errores = [];
const claves = (obj, prefijo = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`],
  );

for (const f of new Set(IDIOMAS.flatMap((i) => archivos[i]))) {
  const porIdioma = {};
  for (const i of IDIOMAS) {
    if (!archivos[i].includes(f)) {
      errores.push(`Falta ${i}/${f}`);
      continue;
    }
    try {
      porIdioma[i] = new Set(claves(JSON.parse(readFileSync(join(raiz, i, f), "utf8"))));
    } catch (e) {
      errores.push(`${i}/${f} no es JSON válido: ${e.message}`);
    }
  }
  const [a, b] = IDIOMAS.map((i) => porIdioma[i]);
  if (a && b) {
    for (const k of a) if (!b.has(k)) errores.push(`${f}: "${k}" está en es y no en en`);
    for (const k of b) if (!a.has(k)) errores.push(`${f}: "${k}" está en en y no en es`);
  }
}

if (errores.length) {
  console.error(`Mensajes con problemas:\n  ${errores.join("\n  ")}`);
  process.exit(1);
}

const nombre = (i, f) => `${f.replace(/\.json$/, "").replace(/[^a-zA-Z0-9]/g, "_")}_${i}`;
const lineas = [
  "// Generado por scripts/mensajes.mjs: no se edita a mano.",
  ...IDIOMAS.flatMap((i) => archivos[i].map((f) => `import ${nombre(i, f)} from "./${i}/${f}";`)),
  "",
  "export const mensajes = {",
  ...IDIOMAS.map(
    (i) => `  ${i}: {\n${archivos[i].map((f) => `    ${JSON.stringify(f.replace(/\.json$/, ""))}: ${nombre(i, f)},`).join("\n")}\n  },`,
  ),
  "};",
  "",
  "export type Mensajes = typeof mensajes.es;",
  "",
];
writeFileSync(join(raiz, "index.ts"), lineas.join("\n"));
console.log(`Mensajes: ${archivos.es.length} archivos por idioma, sin diferencias.`);
