import { Archivo, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Las letras de la landing para agencias (branding/Clipfine Logo Directions,
 * "Clipfine Landing"): Archivo condensada para los títulos, Space Grotesk para
 * las etiquetas y JetBrains Mono para lo que imita la interfaz. Solo las carga
 * la landing; el resto del sitio sigue con Inter.
 */
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap" });

export const VARIABLES_FUENTES = `${archivo.variable} ${grotesk.variable} ${mono.variable}`;
