"use client";

import {
  Bookmark,
  Disc3,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Repeat2,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  LISTA_PLATAFORMAS,
  PLATAFORMAS,
  usuarioDeMuestra,
  type IconoInterfaz,
  type Plataforma,
} from "@/lib/plataformas";

const ICONOS: Record<IconoInterfaz, LucideIcon> = {
  corazon: Heart,
  comentario: MessageCircle,
  guardar: Bookmark,
  compartir: Share2,
  enviar: Send,
  pulgar: ThumbsUp,
  pulgarAbajo: ThumbsDown,
  remix: Repeat2,
  mas: MoreHorizontal,
};

const SOMBRA = "drop-shadow(0 1px 2px rgba(0,0,0,0.6))";

/**
 * Encima de una vista previa 9:16: lo que le pone cada red (ver
 * lib/plataformas). No agarra el mouse, así lo de abajo se sigue editando.
 * La línea punteada es la zona que no tapa nada.
 */
export function InterfazPlataforma({
  plataforma,
  ancho,
  nombreMarca,
}: {
  plataforma: Plataforma;
  /** El ancho de la vista en pantalla: todo se escala desde 1080. */
  ancho: number;
  nombreMarca?: string;
}) {
  const t = useTranslations("estilosInterfaz");
  const ui = PLATAFORMAS[plataforma];
  const k = ancho / 1080;
  const px = (v: number) => v * k;
  const icono = px(78);
  const letra = px(30);

  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Las redes oscurecen abajo para que se lea la descripción. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: px(ui.abajo + 220), background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
      />

      {/* La zona segura. */}
      <div
        className="absolute rounded-sm border border-dashed border-ng-celeste/80"
        style={{ top: px(ui.arriba), bottom: px(ui.abajo), left: px(ui.izquierda), right: px(ui.derecha) }}
      />

      {/* Arriba. */}
      {ui.titulo.length > 0 && (
        <div
          className="absolute inset-x-0 flex justify-center font-semibold"
          style={{ top: px(70), gap: px(40), fontSize: px(36), filter: SOMBRA }}
        >
          {ui.titulo.map((clave, i) => (
            <span
              key={clave}
              style={i === ui.titulo.length - 1 ? { borderBottom: `${px(4)}px solid white`, paddingBottom: px(6) } : { opacity: 0.65 }}
            >
              {t(`textos.${clave}`)}
            </span>
          ))}
        </div>
      )}

      {/* La columna de la derecha. */}
      <div
        className="absolute flex flex-col items-center"
        style={{ top: px(ui.botonesDesde), right: px(24), width: px(ui.derecha - 30), gap: px(34), filter: SOMBRA }}
      >
        {ui.botones.map(({ icono: nombre, texto: literal, clave }, i) => {
          const Icono = ICONOS[nombre];
          const texto = clave ? t(`textos.${clave}`) : literal;
          return (
            <div key={i} className="flex flex-col items-center" style={{ gap: px(6) }}>
              <Icono size={icono} strokeWidth={2} fill={nombre === "corazon" ? "white" : "none"} />
              {texto && <span className="whitespace-nowrap" style={{ fontSize: px(24), fontWeight: 600 }}>{texto}</span>}
            </div>
          );
        })}
        {ui.discoAudio === "disco" && <Disc3 size={px(84)} strokeWidth={1.5} />}
        {ui.discoAudio === "cuadrado" && (
          <div className="rounded-md border-2 border-white bg-white/30" style={{ width: px(70), height: px(70) }} />
        )}
      </div>

      {/* Abajo: el usuario, la descripción y el audio. */}
      <div
        className="absolute"
        style={{ left: px(36), right: px(ui.derecha + 10), bottom: px(110), filter: SOMBRA, fontSize: letra, lineHeight: 1.3 }}
      >
        <div className="flex items-center" style={{ gap: px(16) }}>
          <span className="shrink-0 rounded-full bg-white/80" style={{ width: px(64), height: px(64) }} />
          <span className="truncate font-bold">@{usuarioDeMuestra(nombreMarca, t("usuarioPorDefecto"))}</span>
          {ui.seguir && (
            <span
              className="shrink-0 rounded-full font-semibold"
              style={{
                padding: `${px(6)}px ${px(20)}px`,
                fontSize: px(26),
                ...(plataforma === "SHORTS" ? { background: "white", color: "black" } : { border: `${px(2)}px solid white` }),
              }}
            >
              {t(`textos.${ui.seguir}`)}
            </span>
          )}
        </div>
        <p className="line-clamp-2" style={{ marginTop: px(14) }}>
          {t("descripcion")}
        </p>
        {ui.audio && (
          <p className="flex items-center opacity-90" style={{ marginTop: px(12), gap: px(10), fontSize: px(26) }}>
            <Music2 size={px(28)} />
            <span className="truncate">{t("sonidoOriginal", { marca: nombreMarca ?? t("tuMarca") })}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Los botones para elegir la red de la vista previa. Null es el clip limpio. */
export function SelectorPlataforma({
  valor,
  onCambio,
}: {
  valor: Plataforma | null;
  onCambio: (p: Plataforma | null) => void;
}) {
  const t = useTranslations("estilosInterfaz");
  const opciones: { valor: Plataforma | null; etiqueta: string }[] = [
    { valor: null, etiqueta: t("limpio") },
    ...LISTA_PLATAFORMAS.map((p) => ({ valor: p, etiqueta: PLATAFORMAS[p].nombre })),
  ];
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t("verEnCadaRed")}>
      {opciones.map((o) => (
        <button
          key={o.etiqueta}
          type="button"
          onClick={() => onCambio(o.valor)}
          aria-pressed={valor === o.valor}
          className={`rounded-full border px-2.5 py-0.5 text-xs ${
            valor === o.valor ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/60 hover:bg-white/5"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
