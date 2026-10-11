"use client";

import { useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { useTranslations } from "next-intl";
import { ChevronDown, ClipboardCopy, Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { EXPORTAR_METRICAS } from "@/graphql/operations";
import { Menu } from "@/components/Menu";
import { zonaDelNavegador } from "@/lib/metricas";

type Formato = "CSV" | "MARKDOWN";
type Accion = Formato | "COPIAR";

interface ArchivoExportado {
  nombre: string;
  tipo: string;
  contenido: string;
}

/**
 * Bajar las métricas como archivo (ng-creator-be#119): el backend lo arma en
 * el idioma de quien lo pide y acá se guarda desde un blob con su nombre.
 * Lo usan el menú Exportar de /metricas y la barra del reporte.
 */
export function useExportarMetricas(marcaId: string | undefined, dias: number) {
  const t = useTranslations("metricasExportar");
  const client = useApolloClient();
  const [ocupado, setOcupado] = useState<Accion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // La confirmación de "copiado" se va sola.
  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 3000);
    return () => clearTimeout(id);
  }, [copiado]);

  async function pedir(formato: Formato): Promise<ArchivoExportado> {
    const { data } = await client.query({
      query: EXPORTAR_METRICAS,
      variables: { marcaId, formato, dias, zonaHoraria: zonaDelNavegador() },
      fetchPolicy: "no-cache",
    });
    if (!data?.exportarMetricas) throw new Error("sin archivo");
    return data.exportarMetricas;
  }

  async function descargar(formato: Formato) {
    if (!marcaId || ocupado) return;
    setOcupado(formato);
    setError(null);
    setCopiado(false);
    try {
      const archivo = await pedir(formato);
      const url = URL.createObjectURL(new Blob([archivo.contenido], { type: archivo.tipo }));
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError(t("error"));
    } finally {
      setOcupado(null);
    }
  }

  async function copiar() {
    if (!marcaId || ocupado) return;
    setOcupado("COPIAR");
    setError(null);
    setCopiado(false);
    try {
      // Safari pierde el permiso de escribir si se espera la respuesta antes
      // de tocar el portapapeles: ClipboardItem acepta la promesa y lo guarda.
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const texto = pedir("MARKDOWN").then((a) => new Blob([a.contenido], { type: "text/plain" }));
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": texto })]);
      } else {
        const archivo = await pedir("MARKDOWN");
        await navigator.clipboard.writeText(archivo.contenido);
      }
      setCopiado(true);
    } catch {
      setError(t("errorCopiar"));
    } finally {
      setOcupado(null);
    }
  }

  return { descargar, copiar, ocupado, error, copiado };
}

/** El aviso de abajo del botón: el error, o que se copió. */
export function AvisoExportar({ error, copiado }: { error: string | null; copiado: boolean }) {
  const t = useTranslations("metricasExportar");
  return (
    <p role="status" aria-live="polite" className={`text-xs ${error ? "text-red-300" : "text-white/60"}`}>
      {error ?? (copiado ? t("copiado") : "")}
    </p>
  );
}

const BOTON =
  "bg-marca flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";

/**
 * El menú Exportar de /metricas: CSV, Markdown (bajar o copiar) y el PDF, que
 * es el reporte para el cliente en otra pestaña para imprimirlo.
 */
export function ExportarMetricas({ marcaId, dias }: { marcaId: string | undefined; dias: number }) {
  const t = useTranslations("metricasExportar");
  const { descargar, copiar, ocupado, error, copiado } = useExportarMetricas(marcaId, dias);
  const sinMarca = !marcaId;
  const detalle = (accion: Accion, texto: string) => (ocupado === accion ? t("generando") : texto);

  return (
    <div className="flex flex-col items-end gap-1">
      <Menu
        etiqueta={t("exportar")}
        claseBoton={BOTON}
        boton={
          <>
            {ocupado ? (
              <LoaderCircle size={15} strokeWidth={2} className="animate-spin" aria-hidden />
            ) : (
              <Download size={15} strokeWidth={2} aria-hidden />
            )}
            {ocupado ? t("generando") : t("exportar")}
            <ChevronDown size={14} aria-hidden className="opacity-70" />
          </>
        }
        opciones={[
          {
            texto: t("csv.titulo"),
            detalle: detalle("CSV", t("csv.detalle")),
            icono: <FileSpreadsheet size={16} aria-hidden />,
            deshabilitada: sinMarca || Boolean(ocupado),
            onClick: () => void descargar("CSV"),
          },
          {
            texto: t("markdown.titulo"),
            detalle: detalle("MARKDOWN", t("markdown.detalle")),
            icono: <Download size={16} aria-hidden />,
            deshabilitada: sinMarca || Boolean(ocupado),
            onClick: () => void descargar("MARKDOWN"),
          },
          {
            texto: t("copiar.titulo"),
            detalle: detalle("COPIAR", t("copiar.detalle")),
            icono: <ClipboardCopy size={16} aria-hidden />,
            deshabilitada: sinMarca || Boolean(ocupado),
            onClick: () => void copiar(),
          },
          {
            texto: t("pdf.titulo"),
            detalle: t("pdf.detalle"),
            icono: <FileText size={16} aria-hidden />,
            deshabilitada: sinMarca,
            onClick: () =>
              window.open(`/metricas/reporte?dias=${dias}&marca=${encodeURIComponent(marcaId ?? "")}`, "_blank", "noopener"),
          },
        ]}
      />
      <AvisoExportar error={error} copiado={copiado} />
    </div>
  );
}
