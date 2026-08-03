"use client";

import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/lib/auth";

export function TopBar() {
  const router = useRouter();

  function salir() {
    cerrarSesion();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 rounded-sm"
          style={{ background: "#0FED9D" }}
        />
        <span className="text-sm font-medium tracking-wide">
          COSAS DE FÚTBOL
        </span>
        <span className="text-xs text-white/40">· El Guardián</span>
      </div>
      <button
        onClick={salir}
        className="text-xs text-white/50 hover:text-white/80"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
