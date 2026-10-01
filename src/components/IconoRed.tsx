import { REDES } from "@/lib/publicaciones";

/**
 * La red de una publicación de un vistazo: la foto de la cuenta o, si no hay,
 * la sigla de la red con su color. Lucide ya no trae los logos de las redes.
 */
export function IconoRed({ url, red, chico = false }: { url?: string | null; red: string; chico?: boolean }) {
  const tam = chico ? "h-5 w-5 text-[9px]" : "h-9 w-9 text-xs";
  const r = REDES[red];
  if (url) {
    return (
      <span
        title={r?.nombre}
        className={`shrink-0 rounded-full bg-cover bg-center ${tam}`}
        style={{ backgroundImage: `url(${url})` }}
      />
    );
  }
  return (
    <span
      title={r?.nombre ?? red}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold leading-none ${tam} ${r?.clase ?? "bg-white/10"}`}
    >
      {r?.sigla ?? "?"}
    </span>
  );
}

/** El poster de un clip. Fondo y no <img>: es una imagen del CDN, sin optimizar por Next. */
export function Poster({ url, className = "" }: { url?: string | null; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-lg bg-white/10 bg-cover bg-center ${className}`}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    />
  );
}
