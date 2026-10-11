#!/usr/bin/env node
/**
 * Arma src/contenido/ayuda/index.ts con los artículos de la wiki
 * (src/contenido/ayuda/{es,en}/*.md) y revisa que estén en los dos idiomas,
 * con su cabecera completa y una categoría que exista. Corre antes de `dev` y
 * de `build`, como scripts/mensajes.mjs; a mano: `npm run ayuda`.
 *
 * Los artículos quedan como texto dentro del bundle: así /ayuda, su índice
 * JSON (lo que lee el MCP) y el buscador no dependen de leer archivos en el
 * servidor.
 *
 * Cada .md empieza con:
 *   ---
 *   titulo: Invitá a tu equipo
 *   descripcion: Una línea, para Google y para el buscador.
 *   categoria: equipo
 *   orden: 2
 *   funciones: equipo, revision
 *   ---
 *
 * `funciones` son las secciones de /features que el artículo explica (ids de
 * SECCIONES en src/components/landing/funciones.ts). Así cada función lleva a
 * sus guías y cada guía a su función, y el chat y el MCP saben qué va con qué.
 * Toda sección tiene que tener al menos una guía: si se suma una función sin
 * explicarla, esto falla.
 *
 * Los datos que se repiten (precios, correo de soporte, la prueba) no se
 * escriben: van como {{clave}} de src/lib/datos-producto.ts. Ver
 * docs/FUENTE-DE-VERDAD.md.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "contenido", "ayuda");
const IDIOMAS = ["es", "en"];
const CAMPOS = ["titulo", "descripcion", "categoria", "orden"];
// La misma lista (y en el mismo orden) que CATEGORIAS_AYUDA en src/lib/ayuda.ts.
const CATEGORIAS = readFileSync(join(raiz, "..", "..", "lib", "ayuda.ts"), "utf8")
  .match(/CATEGORIAS_AYUDA = \[([^\]]*)\]/)[1]
  .match(/"([a-z-]+)"/g)
  .map((c) => c.slice(1, -1));

// Los ids de las secciones de /features, del bloque SECCIONES.
const textoFunciones = readFileSync(join(raiz, "..", "..", "components", "landing", "funciones.ts"), "utf8");
const bloqueSecciones = textoFunciones.slice(
  textoFunciones.indexOf("export const SECCIONES = ["),
  textoFunciones.indexOf("] as const satisfies", textoFunciones.indexOf("export const SECCIONES = [")),
);
const SECCIONES = [...bloqueSecciones.matchAll(/^    id: "([a-z-]+)",$/gm)].map((m) => m[1]);
if (!SECCIONES.length) {
  console.error("No se encontraron las secciones en funciones.ts (¿cambió el formato?)");
  process.exit(1);
}

const errores = [];

function leer(idioma, archivo) {
  const texto = readFileSync(join(raiz, idioma, archivo), "utf8");
  const m = texto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    errores.push(`${idioma}/${archivo}: falta la cabecera entre ---`);
    return null;
  }
  const cabecera = Object.fromEntries(
    m[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  for (const c of CAMPOS) if (!cabecera[c]) errores.push(`${idioma}/${archivo}: falta "${c}"`);
  if (!("funciones" in cabecera)) errores.push(`${idioma}/${archivo}: falta "funciones" (puede ir vacío)`);
  const funciones = (cabecera.funciones ?? "").split(",").map((f) => f.trim()).filter(Boolean);
  for (const f of funciones) {
    if (!SECCIONES.includes(f)) errores.push(`${idioma}/${archivo}: la función "${f}" no existe en /features (${SECCIONES.join(", ")})`);
  }
  if (cabecera.categoria && !CATEGORIAS.includes(cabecera.categoria)) {
    errores.push(`${idioma}/${archivo}: la categoría "${cabecera.categoria}" no existe (${CATEGORIAS.join(", ")})`);
  }
  return {
    slug: archivo.replace(/\.md$/, ""),
    titulo: cabecera.titulo,
    descripcion: cabecera.descripcion,
    categoria: cabecera.categoria,
    orden: Number(cabecera.orden),
    funciones,
    cuerpo: m[2].trim(),
  };
}

const archivos = Object.fromEntries(
  IDIOMAS.map((i) => [i, readdirSync(join(raiz, i)).filter((f) => f.endsWith(".md")).sort()]),
);
for (const f of new Set(IDIOMAS.flatMap((i) => archivos[i]))) {
  for (const i of IDIOMAS) if (!archivos[i].includes(f)) errores.push(`Falta ${i}/${f}`);
}

const articulos = Object.fromEntries(
  IDIOMAS.map((i) => [
    i,
    archivos[i]
      .map((f) => leer(i, f))
      .filter(Boolean)
      .sort((a, b) => CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria) || a.orden - b.orden),
  ]),
);
for (const a of articulos.es) {
  const en = articulos.en.find((b) => b.slug === a.slug);
  if (en && en.categoria !== a.categoria) errores.push(`${a.slug}: la categoría no es la misma en es y en`);
  if (en && en.funciones.join() !== a.funciones.join()) errores.push(`${a.slug}: las funciones no son las mismas en es y en`);
}
for (const id of SECCIONES) {
  if (!articulos.es.some((a) => a.funciones.includes(id))) {
    errores.push(`La función "${id}" de /features no tiene ninguna guía: sumá "funciones: ${id}" a un artículo o escribí uno`);
  }
}
const DATOS_USADOS = [
  ...new Set(
    IDIOMAS.flatMap((i) => articulos[i].flatMap((a) => [...`${a.titulo} ${a.descripcion} ${a.cuerpo}`.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => m[1]))),
  ),
].sort();

if (errores.length) {
  console.error(`Ayuda con problemas:\n  ${errores.join("\n  ")}`);
  process.exit(1);
}

writeFileSync(
  join(raiz, "index.ts"),
  [
    "// Generado por scripts/ayuda.mjs desde los .md de esta carpeta: no se edita a mano.",
    'import type { ArticuloAyuda } from "@/lib/ayuda";',
    'import type { ClaveDato } from "@/lib/datos-producto";',
    "",
    "/** Sin resolver: los {{datos}} se reemplazan al leerlos (src/lib/ayuda.ts). */",
    `export const ARTICULOS: Record<"es" | "en", ArticuloAyuda[]> = ${JSON.stringify(articulos, null, 2)};`,
    "",
    "/** Los {{datos}} que usan los artículos: si uno no existe en datos-producto.ts, no compila. */",
    `export const DATOS_USADOS = ${JSON.stringify(DATOS_USADOS)} as const satisfies readonly ClaveDato[];`,
    "",
  ].join("\n"),
);
