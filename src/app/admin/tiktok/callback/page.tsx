"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TIKTOK_CONECTAR } from "@/graphql/operations";

/** Donde viven los canales: la pantalla de redes conectadas. */
const VOLVER = "/admin/facebook";

/**
 * Callback del OAuth de TikTok (ng-creator-be#62).
 *
 * TikTok redirige acá con ?code y ?state. La marca viaja firmada en el state,
 * así que no hace falta recordarla de este lado.
 */
function Callback() {
  const t = useTranslations("redesCallback");
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const yaCorrio = useRef(false);

  const [conectar] = useMutation(TIKTOK_CONECTAR);

  useEffect(() => {
    // El code es de un solo uso: en desarrollo React monta dos veces.
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const denegado = params.get("error");

    if (denegado) {
      setError(
        denegado === "access_denied"
          ? t("cancelaste", { red: "TikTok" })
          : t("devolvioError", { red: "TikTok", error: denegado }),
      );
      return;
    }
    if (!code || !state) {
      setError(t("sinCodigo", { red: "TikTok" }));
      return;
    }

    conectar({ variables: { code, state } })
      .then(() => router.replace(VOLVER))
      .catch((e) => setError(e?.message ?? t("errorCompletar")));
  }, [params, conectar, router, t]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <div className="mb-3 text-4xl opacity-60">⚠️</div>
        <p className="font-medium text-red-400">{t("noSeConecto.cuenta")}</p>
        <p className="mt-2 break-words text-sm text-white/60">{error}</p>
        <button
          onClick={() => router.replace(VOLVER)}
          className="mt-5 rounded-lg bg-marca px-5 py-2.5 text-sm font-medium text-ng-tinta transition hover:brightness-110"
        >
          {t("volver")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
      <p className="mt-4 text-sm text-white/60">{t("conectando", { red: "TikTok" })}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
          </div>
        }
      >
        <Callback />
      </Suspense>
    </DashboardLayout>
  );
}
