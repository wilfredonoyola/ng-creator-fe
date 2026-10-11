"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApolloClient } from "@apollo/client";
import { useTranslations } from "next-intl";
import { LogoNG } from "@/components/LogoNG";
import { SOY_SUPERADMIN } from "@/graphql/operations";
import { cerrarSesion, ErrorDeAutenticacion, iniciarSesion } from "@/lib/auth";

/**
 * El ingreso a /superadmin: aparte del de los clientes, con las mismas
 * cuentas. Después de entrar se pregunta al backend si el correo es de un
 * superadmin; si no, se cierra la sesión ahí mismo. La primera contraseña y
 * "olvidé mi contraseña" siguen en /login.
 */
export default function SuperadminLogin() {
  const t = useTranslations("superadmin.login");
  const router = useRouter();
  const apollo = useApolloClient();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await iniciarSesion(correo.trim(), password);
      if (r.tipo === "nueva-password") {
        setError(t("primeraVez"));
        return;
      }
      const { data } = await apollo.query<{ soySuperadmin: boolean }>({ query: SOY_SUPERADMIN, fetchPolicy: "network-only" });
      if (!data?.soySuperadmin) {
        await cerrarSesion();
        setError(t("sinAcceso"));
        return;
      }
      router.replace("/superadmin/clientes");
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("error"));
    } finally {
      setCargando(false);
    }
  }

  const campo =
    "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul";

  return (
    <main className="flex min-h-screen items-center justify-center bg-ng-hondo px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoNG tamano={48} soloIcono />
          <p className="mt-4 rounded-full bg-marca px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ng-tinta">
            Superadmin
          </p>
          <h1 className="mt-3 text-xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-sm text-ng-secundario">{t("subtitulo")}</p>
        </div>
        <label className="mb-1 block text-xs text-white/50">{t("correo")}</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" required autoFocus className={campo} />
        <label className="mb-1 mt-4 block text-xs text-white/50">{t("password")}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className={campo} />
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="mt-6 w-full rounded-ng-md bg-marca px-5 py-2.5 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
        >
          {cargando ? t("entrando") : t("entrar")}
        </button>
        <p className="mt-4 text-center text-xs text-white/40">
          <Link href="/login" className="hover:text-white">{t("olvide")}</Link>
        </p>
      </form>
    </main>
  );
}
