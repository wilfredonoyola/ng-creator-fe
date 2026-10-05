import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

/** La imagen que aparece al compartir el enlace en WhatsApp, redes o Slack. */
const size = { width: 1200, height: 630 };
const contentType = "image/png";

/**
 * Con `generateImageMetadata` en vez de `export const alt` para que el alt
 * salga en el idioma del pedido. El `id` es fijo: el texto no depende de la
 * URL sino del idioma de quien la pide (el mismo criterio que la página).
 */
export async function generateImageMetadata() {
  const t = await getTranslations("landingImagen");
  return [{ id: "imagen", alt: t("alt"), size, contentType }];
}

export default async function Imagen() {
  const t = await getTranslations("landingImagen");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0A0A0A",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#FFD400", letterSpacing: 6 }}>CLIPFINE</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 950 }}>
          {t("titulo")}
        </div>
        <div style={{ fontSize: 32, color: "#A3A29C", marginTop: 28 }}>
          {t("pie")}
        </div>
      </div>
    ),
    size,
  );
}
