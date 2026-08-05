"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  FACEBOOK_CONECTAR,
  FACEBOOK_ESTADO,
  FACEBOOK_PAGINAS,
  FACEBOOK_PAGINAS_ACTIVAS,
} from "@/graphql/operations";

/**
 * Callback del OAuth de Facebook.
 *
 * Meta redirige acá con ?code y ?state. El code se canjea en el backend, que es
 * el único que tiene el app secret.
 */
function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const yaCorrio = useRef(false);

  const [conectar] = useMutation(FACEBOOK_CONECTAR, {
    refetchQueries: [
      { query: FACEBOOK_ESTADO },
      { query: FACEBOOK_PAGINAS },
      { query: FACEBOOK_PAGINAS_ACTIVAS },
    ],
  });

  useEffect(() => {
    // Un code de OAuth es de un solo uso: en desarrollo React monta dos veces y
    // el segundo intento fallaría con "code already used".
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const denegado = params.get("error");
    const descripcion = params.get("error_description");

    if (denegado) {
      setError(descripcion ?? "Cancelaste la autorización en Facebook");
      return;
    }
    if (!code || !state) {
      setError("Facebook no devolvió el código de autorización");
      return;
    }

    conectar({ variables: { code, state } })
      .then(() => router.replace("/admin/facebook"))
      .catch((e) => setError(e?.message ?? "No se pudo completar la conexión"));
  }, [params, conectar, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <div className="mb-3 text-4xl opacity-60">⚠️</div>
        <p className="font-medium text-red-400">No se conectó</p>
        <p className="mt-2 break-words text-sm text-white/60">{error}</p>
        <button
          onClick={() => router.replace("/admin/facebook")}
          className="mt-5 rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
      <p className="mt-4 text-sm text-white/60">Conectando con Facebook…</p>
      <p className="mt-1 text-xs text-white/35">
        Canjeando el código y trayendo tus páginas
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <DashboardLayout>
      {/* useSearchParams exige Suspense para el prerender de Next. */}
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
          </div>
        }
      >
        <Callback />
      </Suspense>
    </DashboardLayout>
  );
}
