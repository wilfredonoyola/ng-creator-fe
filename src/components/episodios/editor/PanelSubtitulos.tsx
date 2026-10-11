"use client";

import { useTranslations } from "next-intl";
import { SUBTITULO_TAMANO_MAX, SUBTITULO_TAMANO_MIN, type SubtituloClip } from "@/lib/clip-encuadre";
import { Interruptor, Seccion } from "./ui";

/**
 * Subtítulos: prenderlos o apagarlos, su letra, tamaño y lugar, y corregir lo
 * mal transcrito. Mover y agrandar también se hace sobre el video.
 */
export function PanelSubtitulos({
  activos,
  onActivos,
  subtitulo,
  porDefecto,
  onCambiarSubtitulo,
  nombreEstilo,
  correcciones,
  onCorregir,
  onCambiarEstilo,
  puedeEditar,
}: {
  activos: boolean;
  onActivos: (v: boolean) => void;
  subtitulo: SubtituloClip | null;
  porDefecto: SubtituloClip;
  onCambiarSubtitulo: (s: SubtituloClip | null) => void;
  /** Con un estilo de texto que no es KARAOKE: la letra, el efecto y las mayúsculas los pone el estilo. */
  nombreEstilo?: string;
  correcciones: number;
  /** Lleva a la transcripción, en modo corregir. */
  onCorregir: () => void;
  /** Lleva a Texto, donde se elige el estilo. */
  onCambiarEstilo: () => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const tClip = useTranslations("editorClip");
  return (
    <div className="space-y-5">
      <Interruptor
        etiqueta={tr("subtitulos.mostrar")}
        ayuda={tr("subtitulos.mostrarAyuda")}
        valor={activos}
        onCambio={onActivos}
        deshabilitado={!puedeEditar}
      />
      {activos && (
        <EstiloSubtitulos
          delEstilo={nombreEstilo}
          valor={subtitulo}
          porDefecto={porDefecto}
          onCambiar={onCambiarSubtitulo}
          deshabilitado={!puedeEditar}
        />
      )}
      <Seccion titulo={tr("subtitulos.estilo")}>
        <p className="text-xs text-white/50">
          {nombreEstilo ? tr("subtitulos.conEstilo", { estilo: nombreEstilo }) : tr("subtitulos.sinEstilo")}{" "}
          <button type="button" onClick={onCambiarEstilo} className="text-ng-celeste hover:underline">
            {tr("subtitulos.cambiarEstilo")}
          </button>
        </p>
      </Seccion>
      <p className="text-xs text-white/40">
        {tClip.rich("malTranscrita", {
          boton: (c) => (
            <button type="button" onClick={onCorregir} className="text-ng-celeste hover:underline">
              {c}
            </button>
          ),
        })}
        {correcciones > 0 && ` ${tClip("corregidas", { n: correcciones })}`}
      </p>
    </div>
  );
}

/**
 * La letra, el tamaño, el efecto y la altura de los subtítulos. El primer
 * cambio arranca del subtítulo de siempre, en su lugar.
 */
function EstiloSubtitulos({
  valor,
  porDefecto,
  onCambiar,
  deshabilitado,
  delEstilo,
}: {
  delEstilo?: string;
  valor: SubtituloClip | null;
  porDefecto: SubtituloClip;
  onCambiar: (s: SubtituloClip | null) => void;
  deshabilitado: boolean;
}) {
  const tr = useTranslations("editorClip");
  const s = valor ?? porDefecto;
  const poner = (parcial: Partial<SubtituloClip>) => onCambiar({ ...s, ...parcial });
  const boton = (activo: boolean) =>
    `rounded-md px-2.5 py-1 text-xs transition ${activo ? "bg-ng-azul font-medium text-ng-tinta" : "border border-white/10 text-white/60 hover:text-white"}`;
  return (
    <div className="space-y-3 rounded-ng-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/45">{tr("subtitulo.ayuda")}</p>
      {delEstilo && <p className="text-xs text-white/45">{tr("subtitulo.conEstilo", { estilo: delEstilo })}</p>}
      {!delEstilo && (
        <>
          <Fila etiqueta={tr("subtitulo.letra")}>
            {(
              [
                ["NUNITO", "Nunito"],
                ["ANTON", "Anton"],
                ["BEBAS", "Bebas"],
              ] as const
            ).map(([f, t]) => (
              <button key={f} type="button" disabled={deshabilitado} onClick={() => poner({ fuente: f })} className={boton(s.fuente === f)}>
                {t}
              </button>
            ))}
          </Fila>
          <Fila etiqueta={tr("subtitulo.efecto")}>
            {(["CONTORNO", "SOMBRA", "CAJA", "NINGUNO"] as const).map((e) => (
              <button key={e} type="button" disabled={deshabilitado} onClick={() => poner({ efecto: e })} className={boton(s.efecto === e)}>
                {tr(`subtitulo.efectos.${e}`)}
              </button>
            ))}
          </Fila>
        </>
      )}
      <Fila etiqueta={tr("subtitulo.tamano", { n: Math.round(s.tamano) })}>
        <input
          type="range"
          min={SUBTITULO_TAMANO_MIN}
          max={SUBTITULO_TAMANO_MAX}
          step={2}
          value={s.tamano}
          disabled={deshabilitado}
          onChange={(e) => poner({ tamano: Number(e.target.value) })}
          className="w-full min-w-0 flex-1 accent-[#FFD400]"
        />
      </Fila>
      <Fila etiqueta={tr("subtitulo.lugar")}>
        {(
          [
            ["arriba", 0.2],
            ["centro", 0.5],
            ["abajo", porDefecto.centroY],
          ] as const
        ).map(([lugar, y]) => (
          <button key={lugar} type="button" disabled={deshabilitado} onClick={() => poner({ centroY: y })} className={boton(Math.abs(s.centroY - y) < 0.01)}>
            {tr(`subtitulo.lugares.${lugar}`)}
          </button>
        ))}
      </Fila>
      {!delEstilo && (
        <label className="flex items-center gap-1.5 text-xs text-white/70">
          <input type="checkbox" checked={s.mayusculas} disabled={deshabilitado} onChange={(e) => poner({ mayusculas: e.target.checked })} />
          {tr("subtitulo.mayusculas")}
        </label>
      )}
      {valor && (
        <button type="button" disabled={deshabilitado} onClick={() => onCambiar(null)} className="text-xs text-ng-celeste hover:underline">
          {tr("subtitulo.deSiempre")}
        </button>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-white/50">{etiqueta}</span>
      {children}
    </div>
  );
}
