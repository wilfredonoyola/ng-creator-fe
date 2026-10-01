"use client";

import { LogoNG } from "@/components/LogoNG";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmarPasswordNueva,
  establecerPassword,
  iniciarSesion,
  pedirCodigoPassword,
} from "@/lib/auth";

/**
 * Lo que exige el User Pool `ng-creator-prod`.
 *
 * Está acá repetido a propósito, para poder mostrarlo mientras se escribe:
 * Cognito solo dice qué falta *después* de rechazar el intento, y adivinar
 * cuál de las cinco reglas falló es lo que hace abandonar el alta. Si algún
 * día cambia la política del pool, manda igual el mensaje de Cognito, que es
 * la fuente real; esta lista solo puede quedar de más o de menos exigente.
 */
const REQUISITOS: { etiqueta: string; cumple: (v: string) => boolean }[] = [
  { etiqueta: "8 caracteres o más", cumple: (v) => v.length >= 8 },
  { etiqueta: "una mayúscula", cumple: (v) => /[A-Z]/.test(v) },
  { etiqueta: "una minúscula", cumple: (v) => /[a-z]/.test(v) },
  { etiqueta: "un número", cumple: (v) => /\d/.test(v) },
  { etiqueta: "un símbolo", cumple: (v) => /[^A-Za-z0-9]/.test(v) },
];

/**
 * Ingreso, en uno o dos pasos.
 *
 * Quien ya tiene cuenta entra directo. A quien fue invitado, Cognito le manda
 * una contraseña temporal y exige elegir la definitiva antes de dar la sesión:
 * ese segundo paso aparece acá mismo, sin mandarlo a otra pantalla ni pedirle
 * que vuelva a escribir el correo.
 */
/**
 * A donde volver despues de entrar.
 *
 * Se valida que sea una ruta interna: si se aceptara cualquier valor, un enlace
 * preparado podria mandar a alguien a otro sitio despues de escribir su
 * contraseña, que es el momento en que menos mira la barra de direcciones.
 */
function destinoSeguro(): string {
  if (typeof window === "undefined") return "/panel";
  const v = new URLSearchParams(window.location.search).get("volverA");
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/panel";
  return v;
}

export default function LoginPage() {
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
      setAviso("Tu cuenta se eliminó.");
    }
  }, []);

  const modo = sesionDesafio ? "desafio" : (recuperando ?? "entrar");

  const faltantes = REQUISITOS.filter((r) => !r.cumple(nueva));
  const puedeGuardar = faltantes.length === 0 && nueva === repetida;

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
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  async function definir(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetida) {
      setError("Las dos contraseñas no coinciden");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await establecerPassword(correo, nueva, sesionDesafio!);
      router.push(destinoSeguro());
    } catch (err: any) {
      setError(err?.message ?? "No se pudo guardar la contraseña");
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
      setAviso(`Si ${correo.trim()} tiene cuenta, te llegó un código. Si no lo ves, mirá en spam.`);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo mandar el código");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetida) {
      setError("Las dos contraseñas no coinciden");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await confirmarPasswordNueva(correo.trim(), codigo, nueva);
      router.push(destinoSeguro());
    } catch (err: any) {
      setError(err?.message ?? "No se pudo cambiar la contraseña");
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
      <label className="mb-1 block text-xs text-white/50">Nueva contraseña</label>
      <input
        type="password"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
        autoFocus={modo === "desafio"}
        autoComplete="new-password"
        className={`mb-3 ${campo}`}
        required
      />
      {/* Se tildan mientras escribe. Vale más que un párrafo de reglas:
          muestra cuál falta, no la lista entera. */}
      <ul className="mb-4 space-y-1">
        {REQUISITOS.map((r) => {
          const ok = r.cumple(nueva);
          return (
            <li
              key={r.etiqueta}
              className={`flex items-center gap-2 text-[11px] transition-colors ${ok ? "text-ng-teal" : "text-white/35"}`}
            >
              <span className="w-3 shrink-0 text-center">{ok ? "✓" : "·"}</span>
              {r.etiqueta}
            </li>
          );
        })}
      </ul>
      <label className="mb-1 block text-xs text-white/50">Repetila</label>
      <input
        type="password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        autoComplete="new-password"
        className={campo}
        required
      />
      <p className="mb-6 mt-1 h-4 text-[11px] text-white/35">
        {repetida && nueva !== repetida ? <span className="text-red-400">No coinciden</span> : null}
      </p>
    </>
  );

  const titulos = {
    entrar: ["Bienvenido a NG Creator", "Creá, colaborá y publicá más rápido."],
    desafio: ["Elegí tu contraseña", "La que te llegó por correo era temporal. Definí la tuya y entrás directo."],
    pedir: ["Recuperá tu contraseña", "Te mandamos un código a tu correo para elegir una nueva."],
    confirmar: ["Elegí una contraseña nueva", "Escribí el código que te llegó y la contraseña que quieras."],
  } as const;

  const alEnviar = { entrar, desafio: definir, pedir: pedirCodigo, confirmar: confirmarCodigo }[modo];
  const deshabilitado =
    cargando ||
    ((modo === "desafio" || modo === "confirmar") && !puedeGuardar) ||
    (modo === "confirmar" && codigo.trim().length < 4);
  const textoBoton = {
    entrar: cargando ? "Entrando…" : "Entrar",
    desafio: cargando ? "Guardando…" : "Guardar y entrar",
    pedir: cargando ? "Mandando…" : "Mandarme el código",
    confirmar: cargando ? "Guardando…" : "Cambiar y entrar",
  }[modo];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ng-hondo px-4">
      {/* La luz azul/violeta detrás de la tarjeta: sutil, como pide la marca. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.22), rgba(139,92,246,0.10) 45%, transparent 70%)" }}
      />
      <form
        onSubmit={alEnviar}
        className="relative w-full max-w-sm rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-8 backdrop-blur"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoNG tamano={56} soloIcono />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{titulos[modo][0]}</h1>
          <p className="mt-1 text-sm text-ng-secundario">{titulos[modo][1]}</p>
        </div>

        {modo === "desafio" && camposNueva}

        {(modo === "entrar" || modo === "pedir") && (
          <>
            {modo === "entrar" && aviso && (
              <p className="mb-4 rounded-ng-md bg-ng-teal/10 px-3 py-2 text-xs text-ng-teal">{aviso}</p>
            )}
            <label className="mb-1 block text-xs text-white/50">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={`mb-4 ${campo}`}
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus={modo === "pedir"}
              required
            />
          </>
        )}

        {modo === "entrar" && (
          <>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="text-xs text-white/50">Contraseña</label>
              <button
                type="button"
                onClick={() => {
                  setRecuperando("pedir");
                  setError(null);
                }}
                className="text-xs text-ng-celeste hover:underline"
              >
                ¿La olvidaste?
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
            <label className="mb-1 block text-xs text-white/50">Código</label>
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
          className="w-full rounded-ng-md bg-marca py-2.5 text-sm font-semibold text-white brillo-marca transition hover:brightness-110 disabled:opacity-50"
        >
          {textoBoton}
        </button>

        {(modo === "pedir" || modo === "confirmar") && (
          <div className="mt-4 flex justify-between text-xs">
            <button type="button" onClick={volverAEntrar} className="text-white/50 hover:text-white">
              ← Volver a entrar
            </button>
            {modo === "confirmar" && (
              <button
                type="button"
                onClick={(e) => void pedirCodigo(e as unknown as React.FormEvent)}
                disabled={cargando}
                className="text-ng-celeste hover:underline disabled:opacity-50"
              >
                Mandar otro código
              </button>
            )}
          </div>
        )}

        {/* Enlaces públicos: Meta espera encontrarlos accesibles sin sesión. */}
        <div className="mt-6 flex justify-center gap-4 border-t border-white/10 pt-4 text-xs">
          <a href="/privacidad" className="text-white/40 hover:text-ng-celeste">
            Privacidad
          </a>
          <a href="/terminos" className="text-white/40 hover:text-ng-celeste">
            Términos
          </a>
        </div>
      </form>
    </main>
  );
}
