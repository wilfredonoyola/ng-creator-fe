"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { haySesion } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!haySesion()) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="pl-64">
        <div className="min-h-screen p-8">{children}</div>
      </main>
    </div>
  );
}
