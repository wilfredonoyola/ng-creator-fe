import Image from "next/image";

/** El wordmark mide 3960.8 x 713 en su SVG. */
const PROPORCION_WORDMARK = 3960.8 / 713;

/**
 * El logo de Clipfine: el wordmark blanco, sin brillo ni placa, como pide la
 * guía (Clipfine-Brand-Package/01-Logo/LOGO-GUIDELINES.md). `soloIcono` para
 * lugares chicos: debajo de 48px va el ícono "small", que tiene el corte más
 * abierto para que se lea.
 *
 * Los SVG salen del paquete de marca, sin la metadata. Si cambian, se cambian
 * acá (public/brand) y en ng-creator-app.
 */
export function LogoNG({
  tamano = 32,
  soloIcono = false,
  lema = false,
}: {
  /** El alto del ícono; el wordmark va a ~60% de esto, que es el alto de una letra al lado. */
  tamano?: number;
  soloIcono?: boolean;
  /** "Create. Share. Grow." debajo del nombre. */
  lema?: boolean;
}) {
  if (soloIcono) {
    return (
      <Image
        src={tamano < 48 ? "/brand/clipfine-icon-small-white.svg" : "/brand/clipfine-icon-white.svg"}
        alt="Clipfine"
        width={tamano}
        height={tamano}
        priority
        unoptimized
        className="shrink-0"
      />
    );
  }
  const alto = Math.round(tamano * 0.6);
  return (
    <span className="inline-flex flex-col leading-none">
      <Image
        src="/brand/clipfine-wordmark-white.svg"
        alt="Clipfine"
        width={Math.round(alto * PROPORCION_WORDMARK)}
        height={alto}
        priority
        unoptimized
        className="shrink-0"
      />
      {lema && (
        <span className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-ng-secundario">Create · Share · Grow</span>
      )}
    </span>
  );
}
