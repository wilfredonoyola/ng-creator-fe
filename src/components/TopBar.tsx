"use client";

import { useRouter } from "next/navigation";
import { cerrarSesion } from "@/lib/auth";
import { LogoNG } from "./LogoNG";

export function TopBar() {
  const router = useRouter();

  function salir() {
    cerrarSesion();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <LogoNG tamano={28} />
      <button
        onClick={salir}
        className="text-xs text-white/50 hover:text-white/80"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
