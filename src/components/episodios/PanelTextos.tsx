"use client";

import { useTranslations } from "next-intl";
import {
  FUENTES,
  medidasEfecto,
  normalizarPalabra,
  palabrasDelTexto,
  type EfectoTexto,
  type FuenteTexto,
  type Texto,
} from "@/lib/clip-encuadre";

export const MAXIMO_TEXTOS = 4;

/**
 * Diseños listos para arrancar. Es lo que se elige primero; después se puede
 * cambiar cualquier cosa. El de "Marca" toma el color destacado del estilo de
 * la marca, el mismo que resalta la palabra en los subtítulos.
 */
export function disenosDeTexto(colorMarca: string) {
  return [
    {
      id: "impacto" as const,
      estilo: { fuente: "ANTON", tamano: 110, color: "#FFFFFF", colorDestacado: "#FFE600", efecto: "CONTORNO", colorEfecto: "#000000", mayusculas: true },
    },
    {
      id: "caja" as const,
      estilo: { fuente: "BEBAS", tamano: 96, color: "#FFFFFF", colorDestacado: "#FF3B30", efecto: "CAJA", colorEfecto: "#000000", mayusculas: true },
    },
    {
      id: "marca" as const,
      estilo: { fuente: "ANTON", tamano: 90, color: "#000000", colorDestacado: "#FFFFFF", efecto: "CAJA", colorEfecto: colorMarca, mayusculas: true },
    },
    {
      id: "amarillo" as const,
      estilo: { fuente: "ANTON", tamano: 110, color: "#FFE600", colorDestacado: "#FFFFFF", efecto: "CONTORNO", colorEfecto: "#000000", mayusculas: true },
    },
    {
      id: "sombra" as const,
      estilo: { fuente: "NUNITO", tamano: 84, color: "#FFFFFF", colorDestacado: "#FFE600", efecto: "SOMBRA", colorEfecto: "#000000", mayusculas: false },
    },
    {
      id: "limpio" as const,
      estilo: { fuente: "NUNITO", tamano: 72, color: "#FFFFFF", colorDestacado: "#14D8C4", efecto: "NINGUNO", colorEfecto: "#000000", mayusculas: false },
    },
  ] satisfies {
    id: string;
    estilo: Pick<Texto, "fuente" | "tamano" | "color" | "colorDestacado" | "efecto" | "colorEfecto" | "mayusculas">;
  }[];
}

/** Un texto nuevo con un diseño, en la parte de arriba y todo el clip. */
export function textoNuevo(
  estilo: ReturnType<typeof disenosDeTexto>[number]["estilo"],
  contenido: string,
  centroY: number,
): Texto {
  return { contenido, destacadas: [], ...estilo, centroX: 0.5, centroY, ancho: 0.85, desdeSeg: 0, hastaSeg: null };
}

const FUENTES_ELEGIBLES: { valor: FuenteTexto; etiqueta: string }[] = [
  { valor: "ANTON", etiqueta: "Anton" },
  { valor: "BEBAS", etiqueta: "Bebas" },
  { valor: "NUNITO", etiqueta: "Nunito" },
];

const EFECTOS: EfectoTexto[] = ["CONTORNO", "SOMBRA", "CAJA", "NINGUNO"];

const POSICIONES = [
  { clave: "arriba", centroY: 0.15 },
  { clave: "centro", centroY: 0.5 },
  { clave: "abajo", centroY: 0.85 },
] as const;

/**
 * Los textos del clip: hasta cuatro, cada uno con su diseño.
 *
 * Se piensa como en los editores de video: elegir un diseño, escribir, y
 * tocar las palabras que van destacadas. Mover el texto se hace arrastrándolo
 * en la vista previa; acá están los atajos (arriba, centro, abajo).
 */
export function PanelTextos({
  textos,
  onCambiar,
  elegido,
  onElegir,
  duracion,
  colorMarca,
  deshabilitado,
}: {
  textos: Texto[];
  onCambiar: (t: Texto[]) => void;
  elegido: number | null;
  onElegir: (i: number | null) => void;
  /** Del clip, en segundos. */
  duracion: number;
  colorMarca: string;
  deshabilitado?: boolean;
}) {
  const tr = useTranslations("editorTextos");
  const disenos = disenosDeTexto(colorMarca);

  function agregar(d: (typeof disenos)[number]) {
    if (textos.length >= MAXIMO_TEXTOS) return;
    // Cada nuevo un poco más abajo que el anterior, para que no se pisen.
    const centroY = [0.15, 0.3, 0.7, 0.85][textos.length] ?? 0.5;
    onCambiar([...textos, textoNuevo(d.estilo, tr("textoNuevo"), centroY)]);
    onElegir(textos.length);
  }

  function cambiar(i: number, parcial: Partial<Texto>) {
    onCambiar(textos.map((t, k) => (k === i ? { ...t, ...parcial } : t)));
  }

  function quitar(i: number) {
    onCambiar(textos.filter((_, k) => k !== i));
    onElegir(null);
  }

  const t = elegido !== null ? textos[elegido] : null;

  return (
    <div>
      {/* ---- La lista ---- */}
      <div className="mb-3 flex flex-wrap gap-2">
        {textos.map((tx, i) => (
          <button
            key={i}
            onClick={() => onElegir(elegido === i ? null : i)}
            className={`max-w-[12rem] truncate rounded-lg border px-2.5 py-1 text-xs ${
              elegido === i ? "border-ng-azul text-white" : "border-white/15 text-white/60"
            }`}
          >
            {i + 1}. {tx.contenido || tr("vacio")}
          </button>
        ))}
        {textos.length === 0 && <p className="text-xs text-white/40">{tr("sinTextos")}</p>}
      </div>

      {/* ---- Agregar con un diseño ---- */}
      {!deshabilitado && textos.length < MAXIMO_TEXTOS && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-white/50">
            {tr("agregar", { n: textos.length, max: MAXIMO_TEXTOS })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {disenos.map((d) => (
              <button
                key={d.id}
                onClick={() => agregar(d)}
                title={tr(`disenos.${d.id}`)}
                className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-ng-elevada hover:border-white/30"
              >
                <MuestraDiseno estilo={d.estilo} />
                <span className="text-[10px] text-white/45">{tr(`disenos.${d.id}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- El elegido ---- */}
      {t && elegido !== null && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <textarea
            value={t.contenido}
            onChange={(e) => cambiar(elegido, { contenido: e.target.value })}
            maxLength={160}
            rows={2}
            disabled={deshabilitado}
            className="w-full resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />

          <div>
            <p className="mb-1.5 text-xs text-white/50">{tr("tocaDestacadas")}</p>
            <div className="flex flex-wrap gap-1">
              {palabrasDelTexto(t).map((w, j) => (
                <button
                  key={j}
                  disabled={deshabilitado}
                  onClick={() => {
                    const n = normalizarPalabra(w.texto);
                    if (!n) return;
                    const sin = t.destacadas.filter((d) => normalizarPalabra(d) !== n);
                    cambiar(elegido, { destacadas: w.destacada ? sin : [...sin, w.texto] });
                  }}
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={
                    w.destacada
                      ? { background: t.colorDestacado, color: "#000", fontWeight: 700 }
                      : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }
                  }
                >
                  {w.texto}
                </button>
              ))}
            </div>
          </div>

          <Fila etiqueta={tr("filas.letra")}>
            {FUENTES_ELEGIBLES.map((f) => (
              <Opcion key={f.valor} activa={t.fuente === f.valor} onClick={() => cambiar(elegido, { fuente: f.valor })} deshabilitado={deshabilitado}>
                <span style={{ fontFamily: `'${FUENTES[f.valor].familia}'`, fontWeight: f.valor === "NUNITO" ? 900 : 400 }}>
                  {f.etiqueta}
                </span>
              </Opcion>
            ))}
            <Opcion activa={t.mayusculas} onClick={() => cambiar(elegido, { mayusculas: !t.mayusculas })} deshabilitado={deshabilitado}>
              AA
            </Opcion>
          </Fila>

          <Fila etiqueta={tr("filas.alrededor")}>
            {EFECTOS.map((e) => (
              <Opcion key={e} activa={t.efecto === e} onClick={() => cambiar(elegido, { efecto: e })} deshabilitado={deshabilitado}>
                {tr(`efectos.${e}`)}
              </Opcion>
            ))}
          </Fila>

          <Fila etiqueta={tr("filas.colores")}>
            <Color etiqueta={tr("colores.texto")} valor={t.color} onCambio={(color) => cambiar(elegido, { color })} deshabilitado={deshabilitado} />
            <Color etiqueta={tr("colores.destacado")} valor={t.colorDestacado} onCambio={(colorDestacado) => cambiar(elegido, { colorDestacado })} deshabilitado={deshabilitado} />
            {t.efecto !== "NINGUNO" && (
              <Color
                etiqueta={tr(`colores.${t.efecto === "CAJA" ? "caja" : t.efecto === "SOMBRA" ? "sombra" : "contorno"}`)}
                valor={t.colorEfecto}
                onCambio={(colorEfecto) => cambiar(elegido, { colorEfecto })}
                deshabilitado={deshabilitado}
              />
            )}
          </Fila>

          <label className="block text-xs text-white/50">
            {tr("tamano", { n: Math.round(t.tamano) })}
            <input type="range" min={40} max={200} step={1} value={t.tamano} disabled={deshabilitado}
              onChange={(e) => cambiar(elegido, { tamano: parseFloat(e.target.value) })} className="mt-1 block w-full" />
          </label>
          <label className="block text-xs text-white/50">
            {tr("anchoMaximo", { n: Math.round(t.ancho * 100) })}
            <input type="range" min={0.3} max={1} step={0.01} value={t.ancho} disabled={deshabilitado}
              onChange={(e) => cambiar(elegido, { ancho: parseFloat(e.target.value) })} className="mt-1 block w-full" />
          </label>

          <Fila etiqueta={tr("filas.lugar")}>
            {POSICIONES.map((p) => (
              <Opcion key={p.clave} activa={Math.abs(t.centroY - p.centroY) < 0.02 && Math.abs(t.centroX - 0.5) < 0.02}
                onClick={() => cambiar(elegido, { centroX: 0.5, centroY: p.centroY })} deshabilitado={deshabilitado}>
                {tr(`posiciones.${p.clave}`)}
              </Opcion>
            ))}
            <span className="text-[11px] text-white/35">{tr("oArrastralo")}</span>
          </Fila>

          <Fila etiqueta={tr("filas.cuando")}>
            <Opcion activa={!t.hastaSeg && t.desdeSeg === 0} onClick={() => cambiar(elegido, { desdeSeg: 0, hastaSeg: null })} deshabilitado={deshabilitado}>
              {tr("todoElClip")}
            </Opcion>
            <Opcion activa={t.desdeSeg === 0 && t.hastaSeg === 3} onClick={() => cambiar(elegido, { desdeSeg: 0, hastaSeg: 3 })} deshabilitado={deshabilitado}>
              {tr("primeros3")}
            </Opcion>
            <span className="flex items-center gap-1 text-[11px] text-white/50">
              {tr("de")}
              <Segundos valor={t.desdeSeg} max={duracion} onCambio={(desdeSeg) => cambiar(elegido, { desdeSeg })} deshabilitado={deshabilitado} />
              {tr("a")}
              <Segundos valor={t.hastaSeg ?? duracion} max={duracion}
                onCambio={(v) => cambiar(elegido, { hastaSeg: v >= duracion - 0.05 ? null : v })} deshabilitado={deshabilitado} />
              s
            </span>
          </Fila>

          {!deshabilitado && (
            <button onClick={() => quitar(elegido)} className="text-xs text-red-400/80 hover:text-red-400">
              {tr("quitar")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Cómo se ve un diseño, en chico, para elegirlo. */
function MuestraDiseno({ estilo }: { estilo: ReturnType<typeof disenosDeTexto>[number]["estilo"] }) {
  const tr = useTranslations("editorTextos");
  const f = FUENTES[estilo.fuente];
  const escala = 0.28;
  const { borde, sombra } = medidasEfecto(estilo.efecto, estilo.tamano);
  return (
    <span
      style={{
        fontFamily: `'${f.familia}', sans-serif`,
        fontWeight: estilo.fuente === "NUNITO" ? 900 : 400,
        fontSize: estilo.tamano * f.factorCss * escala,
        lineHeight: 1.1,
        color: estilo.color,
        textTransform: estilo.mayusculas ? "uppercase" : "none",
        ...(estilo.efecto === "CONTORNO" ? { WebkitTextStroke: `${2 * borde * escala}px ${estilo.colorEfecto}`, paintOrder: "stroke fill" } : {}),
        ...(estilo.efecto === "SOMBRA" ? { textShadow: `${sombra * escala}px ${sombra * escala}px 0 ${estilo.colorEfecto}` } : {}),
        ...(estilo.efecto === "CAJA" ? { background: estilo.colorEfecto, padding: `1px ${borde * escala}px` } : {}),
      }}
    >
      {tr.rich("muestra", { d: (c) => <span style={{ color: estilo.colorDestacado }}>{c}</span> })}
    </span>
  );
}

export function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-20 shrink-0 text-xs text-white/50">{etiqueta}</span>
      {children}
    </div>
  );
}

export function Opcion({
  activa,
  onClick,
  children,
  deshabilitado,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
  deshabilitado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitado}
      className={`rounded-md px-2 py-1 text-xs ${
        activa ? "bg-white text-black" : "border border-white/15 text-white/70 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Color({
  etiqueta,
  valor,
  onCambio,
  deshabilitado,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  deshabilitado?: boolean;
}) {
  return (
    <label className="flex items-center gap-1 rounded-md border border-white/15 px-1.5 py-0.5 text-[11px] text-white/70">
      <input
        type="color"
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => onCambio(e.target.value.toUpperCase())}
        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      {etiqueta}
    </label>
  );
}

export function Segundos({
  valor,
  max,
  onCambio,
  deshabilitado,
}: {
  valor: number;
  max: number;
  onCambio: (v: number) => void;
  deshabilitado?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      step={0.1}
      value={Math.round(valor * 10) / 10}
      disabled={deshabilitado}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onCambio(Math.min(max, Math.max(0, n)));
      }}
      className="w-14 rounded border border-white/15 bg-black/30 px-1 py-0.5 text-center tabular-nums"
    />
  );
}
