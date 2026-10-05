"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  confirmarRegistro,
  ErrorDeAutenticacion,
  iniciarSesion,
  reenviarCodigoRegistro,
  registrarse,
} from "@/lib/auth";
import { passwordValida, RequisitosPassword } from "@/components/acceso/RequisitosPassword";
import { conVolverA, MarcoAcceso } from "@/components/acceso/MarcoAcceso";
import { NOMBRE_MAX, NOMBRE_MIN } from "@/lib/nombre";

/**
 * Registro abierto con prueba gratis.
 *
 * Dos pasos en la misma tarjeta: correo y contraseña, y después el código que
 * Cognito manda al correo. Al confirmar entra solo, con la contraseña que
 * acaba de escribir, y sigue al onboarding a crear su marca: pedirle que vuelva
 * a escribir todo en /login es donde se pierde gente.
 */
export default function RegistroPage() {
  const t = useTranslations("registro");
  const router = useRouter();
  const [paso, setPaso] = useState<"datos" | "codigo">("datos");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const email = correo.trim();
  // Con el nombre la ve su equipo en los avisos y en los clips, no con el
  // correo. Es opcional: si lo deja vacío lo puede poner después en Perfil.
  const nombreLimpio = nombre.trim();
  const nombreValido =
    nombreLimpio.length === 0 || (nombreLimpio.length >= NOMBRE_MIN && nombreLimpio.length <= NOMBRE_MAX);
  const puedeCrear = passwordValida(password) && password === repetida && email.length > 0 && nombreValido;

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repetida) {
      setError(t("noCoincidenLargo"));
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await registrarse(email, password, nombreLimpio || null);
      setPaso("codigo");
      setCodigo("");
      setAviso(t("codigoEnviado", { correo: email }));
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorCrear"));
    } finally {
      setCargando(false);
    }
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await confirmarRegistro(email, codigo);
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorConfirmar"));
      setCargando(false);
      return;
    }
    try {
      const r = await iniciarSesion(email, password);
      // Una cuenta recién creada no tiene contraseña temporal; si igual la
      // pidiera, /login sabe cerrar ese paso.
      router.push(r.tipo === "sesion" ? "/onboarding" : "/login");
    } catch {
      // La cuenta quedó creada y confirmada: solo falta entrar a mano.
      router.push("/login");
    }
  }

  async function otroCodigo() {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      await reenviarCodigoRegistro(email);
      setAviso(t("codigoReenviado", { correo: email }));
    } catch (err) {
      setError(err instanceof ErrorDeAutenticacion ? err.message : t("errorReenviar"));
    } finally {
      setCargando(false);
    }
  }

  const campo =
    "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul";

  return (
    <MarcoAcceso
      titulo={t(`titulos.${paso}`)}
      subtitulo={t(`subtitulos.${paso}`)}
      onSubmit={paso === "datos" ? crear : confirmar}
    >
      {paso === "datos" ? (
        <>
          <label className="mb-1 block text-xs text-white/50">{t("nombre")}</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`mb-4 ${campo}`}
            placeholder={t("nombreEjemplo")}
            autoComplete="name"
            minLength={NOMBRE_MIN}
            maxLength={NOMBRE_MAX}
            autoFocus
          />
          <label className="mb-1 block text-xs text-white/50">{t("correo")}</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={`mb-4 ${campo}`}
            placeholder={t("correoEjemplo")}
            autoComplete="email"
            required
          />
          <label className="mb-1 block text-xs text-white/50">{t("password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={`mb-3 ${campo}`}
            required
          />
          <RequisitosPassword valor={password} />
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
            {repetida && password !== repetida ? <span className="text-red-400">{t("noCoinciden")}</span> : null}
          </p>
        </>
      ) : (
        <>
          {aviso && <p className="mb-4 rounded-ng-md bg-ng-teal/10 px-3 py-2 text-xs text-ng-teal">{aviso}</p>}
          <label className="mb-1 block text-xs text-white/50">{t("codigo")}</label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            autoFocus
            className={`mb-6 tracking-[0.3em] ${campo}`}
            required
          />
        </>
      )}

      {/* Los errores del backend (correo ya usado, código vencido) llegan
          traducidos: se muestran tal cual. */}
      {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={cargando || (paso === "datos" ? !puedeCrear : codigo.length !== 6)}
        className="w-full rounded-ng-md bg-marca py-2.5 text-sm font-semibold text-ng-tinta brillo-marca transition hover:brightness-110 disabled:opacity-50"
      >
        {paso === "datos"
          ? t(cargando ? "botones.creando" : "botones.crear")
          : t(cargando ? "botones.confirmando" : "botones.confirmar")}
      </button>

      {paso === "codigo" && (
        <div className="mt-4 flex justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setPaso("datos");
              setError(null);
              setAviso(null);
            }}
            className="text-white/50 hover:text-white"
          >
            {t("cambiarCorreo")}
          </button>
          <button
            type="button"
            onClick={() => void otroCodigo()}
            disabled={cargando}
            className="text-ng-celeste hover:underline disabled:opacity-50"
          >
            {t("otroCodigo")}
          </button>
        </div>
      )}

      {paso === "datos" && (
        <p className="mt-4 text-center text-xs text-white/50">
          {t.rich("conCuenta", {
            link: (c) => (
              <Link href={conVolverA("/login")} className="font-medium text-ng-celeste hover:underline">
                {c}
              </Link>
            ),
          })}
        </p>
      )}
    </MarcoAcceso>
  );
}
