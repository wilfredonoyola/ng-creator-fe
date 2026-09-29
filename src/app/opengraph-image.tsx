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
          background: "radial-gradient(ellipse at top left, #1d3a7a 0%, #0B0F1A 55%, #05070d 100%)",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#60A5FA", letterSpacing: 6 }}>NG CREATOR</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 950 }}>
          Del episodio completo a clips que se comparten
        </div>
        <div style={{ fontSize: 32, color: "#94A3B8", marginTop: 28 }}>
          IA que encuentra los momentos · subtítulos · TikTok, Reels y Shorts
        </div>
      </div>
    ),
    size,
  );
}
