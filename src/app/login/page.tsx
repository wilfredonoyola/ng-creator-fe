"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  confirmarPasswordNueva,
  ErrorDeAutenticacion,
  establecerPassword,
  iniciarSesion,
  pedirCodigoPassword,
} from "@/lib/auth";
import { passwordValida, RequisitosPassword } from "@/components/acceso/RequisitosPassword";
import { conVolverA, destinoSeguro, MarcoAcceso } from "@/components/acceso/MarcoAcceso";

/**
 * Ingreso, en uno o dos pasos.
 *
 * Quien ya tiene cuenta entra directo. A quien fue invitado, Cognito le manda
 * una contraseña temporal y exige elegir la definitiva antes de dar la sesión:
 * ese segundo paso aparece acá mismo, sin mandarlo a otra pantalla ni pedirle
 * que vuelva a escribir el correo.
 */
export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Cuando hay sesión de desafío, estamos en el segundo paso.
  const [sesionDesafio, setSesionDesafio] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");

  // "Olvidé mi contraseña": primero se pide el código, después se usa.
  const [recuperando, setRecuperando] = useState<null | "pedir" | "confirmar">(null);
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  // Quien acaba de eliminar su cuenta llega acá con el aviso en la URL. Se lee
  // después del montaje, como volverA, para no romper la hidratación.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("aviso") === "cuenta-eliminada") {
      setAviso(t("cuentaEliminada"));
    }
  }, [t]);

  const modo = sesionDesafio ? "desafio" : (recuperando ?? "entrar");

  const puedeGuardar = passwordValida(nueva) && nueva === repetida;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const resultado = await iniciarSesion(correo, password);
      if (resultado.tipo === "nueva-password") {
        setSesionDesafio(resultado.sesion);
        return;
      }
      router.push(destinoSeguro());
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorEntrar"));
    } finally {
      setCargando(false);
    }
  }

  async function definir(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetida) {
      setError(t("noCoincidenLargo"));
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await establecerPassword(correo, nueva, sesionDesafio!);
      router.push(destinoSeguro());
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorGuardar"));
    } finally {
      setCargando(false);
    }
  }

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      await pedirCodigoPassword(correo.trim());
      setRecuperando("confirmar");
      setNueva("");
      setRepetida("");
      setCodigo("");
      setAviso(t("codigoEnviado", { correo: correo.trim() }));
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorCodigo"));
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetida) {
      setError(t("noCoincidenLargo"));
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await confirmarPasswordNueva(correo.trim(), codigo, nueva);
      router.push(destinoSeguro());
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorCambiar"));
    } finally {
      setCargando(false);
    }
  }

  function volverAEntrar() {
    setRecuperando(null);
    setError(null);
    setAviso(null);
    setCodigo("");
  }

  const campo =
    "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul";

  /** La contraseña nueva con sus requisitos: el primer ingreso y la recuperación usan la misma. */
  const camposNueva = (
    <>
      <label className="mb-1 block text-xs text-white/50">{t("nuevaPassword")}</label>
      <input
        type="password"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        autoFocus={modo === "desafio"}
        autoComplete="new-password"
        className={`mb-3 ${campo}`}
        required
      />
      <RequisitosPassword valor={nueva} />
      <label className="mb-1 block text-xs text-white/50">{t("repetila")}</label>
      <input
        type="password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        autoComplete="new-password"
        className={campo}
        required
      />
      <p className="mb-6 mt-1 h-4 text-[11px] text-white/35">
        {repetida && nueva !== repetida ? <span className="text-red-400">{t("noCoinciden")}</span> : null}
      </p>
    </>
  );

  const alEnviar = { entrar, desafio: definir, pedir: pedirCodigo, confirmar: confirmarCodigo }[modo];
  const deshabilitado =
    cargando ||
    ((modo === "desafio" || modo === "confirmar") && !puedeGuardar) ||
    (modo === "confirmar" && codigo.trim().length < 4);
  const textoBoton = {
    entrar: t(cargando ? "botones.entrando" : "botones.entrar"),
    desafio: t(cargando ? "botones.guardando" : "botones.desafio"),
    pedir: t(cargando ? "botones.mandando" : "botones.pedir"),
    confirmar: t(cargando ? "botones.guardando" : "botones.confirmar"),
  }[modo];

  return (
    <MarcoAcceso titulo={t(`titulos.${modo}`)} subtitulo={t(`subtitulos.${modo}`)} onSubmit={alEnviar}>
      {modo === "desafio" && camposNueva}

      {(modo === "entrar" || modo === "pedir") && (
        <>
          {modo === "entrar" && aviso && (
            <p className="mb-4 rounded-ng-md bg-ng-teal/10 px-3 py-2 text-xs text-ng-teal">{aviso}</p>
          )}
          <label className="mb-1 block text-xs text-white/50">{t("correo")}</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={`mb-4 ${campo}`}
            placeholder={t("correoEjemplo")}
            autoComplete="email"
            autoFocus={modo === "pedir"}
            required
          />
        </>
      )}

      {modo === "entrar" && (
        <>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-xs text-white/50">{t("password")}</label>
            <button
              type="button"
              onClick={() => {
                setRecuperando("pedir");
                setError(null);
              }}
              className="text-xs text-ng-celeste hover:underline"
            >
              {t("olvidaste")}
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mb-6 ${campo}`}
            autoComplete="current-password"
            required
          />
        </>
      )}

      {modo === "confirmar" && (
        <>
          {aviso && <p className="mb-4 rounded-ng-md bg-ng-teal/10 px-3 py-2 text-xs text-ng-teal">{aviso}</p>}
          <label className="mb-1 block text-xs text-white/50">{t("codigo")}</label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\s/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            autoFocus
            className={`mb-4 tracking-[0.3em] ${campo}`}
            required
          />
          {camposNueva}
        </>
      )}

      {/* El mensaje de contraseña débil viene tal cual lo escribe Cognito,
          que es quien conoce la política del User Pool. */}
      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={deshabilitado}
        className="w-full rounded-ng-md bg-marca py-2.5 text-sm font-semibold text-ng-tinta brillo-marca transition hover:brightness-110 disabled:opacity-50"
      >
        {textoBoton}
      </button>

      {(modo === "pedir" || modo === "confirmar") && (
        <div className="mt-4 flex justify-between text-xs">
          <button type="button" onClick={volverAEntrar} className="text-white/50 hover:text-white">
            {t("volver")}
          </button>
          {modo === "confirmar" && (
            <button
              type="button"
              onClick={(e) => void pedirCodigo(e as unknown as React.FormEvent)}
              disabled={cargando}
              className="text-ng-celeste hover:underline disabled:opacity-50"
            >
              {t("otroCodigo")}
            </button>
          )}
        </div>
      )}

      {modo === "entrar" && (
        <p className="mt-4 text-center text-xs text-white/50">
          {t.rich("sinCuenta", {
            link: (c) => (
              <Link href={conVolverA("/registro")} className="font-medium text-ng-celeste hover:underline">
                {c}
              </Link>
            ),
          })}
        </p>
      )}
    </MarcoAcceso>
  );
}
