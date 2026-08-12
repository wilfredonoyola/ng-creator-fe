"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { establecerPassword, iniciarSesion } from "@/lib/auth";

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
  if (typeof window === "undefined") return "/";
  const v = new URLSearchParams(window.location.search).get("volverA");
  if (!v || !v.startsWith("/") || v.startsWith("//")) return "/";
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

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={sesionDesafio ? definir : entrar}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ background: "#0FED9D" }}
          />
          <span className="text-sm font-medium tracking-wide">
            NG VIDEO CREATOR
          </span>
        </div>

        {sesionDesafio ? (
          <>
            <h1 className="text-base font-semibold">Elegí tu contraseña</h1>
            <p className="mb-5 mt-1 text-xs text-white/45">
              La que te llegó por correo era temporal. Definí la tuya y entrás
              directo.
            </p>

            <label className="mb-1 block text-xs text-white/50">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoFocus
              autoComplete="new-password"
              className="mb-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
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
                    className={`flex items-center gap-2 text-[11px] transition-colors ${
                      ok ? "text-[#0FED9D]" : "text-white/35"
                    }`}
                  >
                    <span className="w-3 shrink-0 text-center">
                      {ok ? "✓" : "·"}
                    </span>
                    {r.etiqueta}
                  </li>
                );
              })}
            </ul>

            <label className="mb-1 block text-xs text-white/50">
              Repetila
            </label>
            <input
              type="password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
              required
            />
            <p className="mb-6 mt-1 h-4 text-[11px] text-white/35">
              {repetida && nueva !== repetida ? (
                <span className="text-red-400">No coinciden</span>
              ) : null}
            </p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs text-white/50">Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
              placeholder="tu@correo.com"
              required
            />

            <label className="mb-1 block text-xs text-white/50">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
              required
            />
          </>
        )}

        {/* El mensaje de contraseña débil viene tal cual lo escribe Cognito,
            que es quien conoce la política del User Pool. */}
        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando || (!!sesionDesafio && !puedeGuardar)}
          className="w-full rounded-lg py-2 text-sm font-medium text-black disabled:opacity-50"
          style={{ background: "#0FED9D" }}
        >
          {cargando
            ? sesionDesafio
              ? "Guardando…"
              : "Entrando…"
            : sesionDesafio
              ? "Guardar y entrar"
              : "Entrar"}
        </button>

        {/* Enlaces públicos: Meta espera encontrarlos accesibles sin sesión. */}
        <div className="mt-6 flex justify-center gap-4 border-t border-white/10 pt-4 text-xs">
          <a href="/privacidad" className="text-white/40 hover:text-[#0FED9D]">
            Privacidad
          </a>
          <a href="/terminos" className="text-white/40 hover:text-[#0FED9D]">
            Términos
          </a>
        </div>
      </form>
    </main>
  );
}
