import Image from "next/image";

/**
 * El logo de NG Creator: el monograma NG y la palabra al lado, como pide la
 * guía de marca ("[NG ICON] NG Creator"). `soloIcono` para lugares chicos.
 *
 * El monograma es un PNG con transparencia sacado de branding/Logo.png: no hay
 * vector. Si algún día lo hay, se cambia acá y en ng-creator-app.
 */
export function LogoNG({
  tamano = 32,
  soloIcono = false,
  lema = false,
}: {
  tamano?: number;
  soloIcono?: boolean;
  /** "Create. Share. Grow." debajo del nombre. */
  lema?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/brand/ng-monograma.png"
        alt={soloIcono ? "NG Creator" : ""}
        width={tamano}
        height={tamano}
        priority
        className="shrink-0 drop-shadow-[0_0_14px_rgba(168,85,247,0.35)]"
      />
      {!soloIcono && (
        <span className="flex flex-col leading-none">
          <span className="font-semibold tracking-tight text-ng-texto" style={{ fontSize: tamano * 0.56 }}>
            NG Creator
          </span>
          {lema && (
            <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-ng-secundario">
              Create · Share · Grow
            </span>
          )}
        </span>
      )}
    </span>
  );
}
