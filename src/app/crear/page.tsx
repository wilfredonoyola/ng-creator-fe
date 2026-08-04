"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CreateVideoWizard } from "@/components/CreateVideoWizard";

export default function CrearPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Crear Video</h1>
        <p className="mt-1 text-white/50">
          Sube un clip y genera contenido automáticamente
        </p>
      </div>

      <CreateVideoWizard
        onComplete={() => {
          router.push("/revision");
        }}
      />
    </DashboardLayout>
  );
}
