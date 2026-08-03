"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { iniciarSesion } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(correo, password);
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm"
            style={{ background: "#0FED9D" }}
          />
          <span className="text-sm font-medium tracking-wide">
            COSAS DE FÚTBOL
          </span>
        </div>

        <label className="mb-1 block text-xs text-white/50">Correo</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
          placeholder="tu@correo.com"
          required
        />

        <label className="mb-1 block text-xs text-white/50">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]"
          required
        />

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-lg py-2 text-sm font-medium text-black disabled:opacity-50"
          style={{ background: "#0FED9D" }}
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
