"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CreateVideoWizard } from "@/components/CreateVideoWizard";

export default function CrearPage() {
  const t = useTranslations("marcoCrear");
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 text-white/50">{t("subtitulo")}</p>
      </div>

      <CreateVideoWizard
        onComplete={() => {
          router.push("/revision");
        }}
      />
    </DashboardLayout>
  );
}
