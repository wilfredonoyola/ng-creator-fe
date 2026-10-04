import { ImageResponse } from "next/og";

/** La imagen que aparece al compartir el enlace en WhatsApp, redes o Slack. */
export const alt = "NG Creator — De tu podcast a clips listos para publicar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Imagen() {
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
        <div style={{ fontSize: 34, color: "#FFD400", letterSpacing: 6 }}>NG CREATOR</div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 950 }}>
          Subí el episodio. Publicá los clips. Todo en un solo lugar.
        </div>
        <div style={{ fontSize: 32, color: "#A3A29C", marginTop: 28 }}>
          Transcripción · momentos con IA · edición en equipo · todas tus redes
        </div>
      </div>
    ),
    size,
  );
}
