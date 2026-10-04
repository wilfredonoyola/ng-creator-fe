import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LegalLayout, Seccion } from "@/components/LegalLayout";
import { ACTUALIZADO, CONTACTO, RESPONSABLE } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legalTerminos");
  return {
    title: t("meta.titulo"),
    description: t("meta.descripcion"),
    alternates: { canonical: "/terminos" },
  };
}

const Enlace = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-ng-celeste hover:underline">
    {children}
  </a>
);

const Correo = () => (
  <a href={`mailto:${CONTACTO}`} className="text-ng-celeste hover:underline">
    {CONTACTO}
  </a>
);

/** Las etiquetas que usan los textos de los términos (ver legalTerminos.json). */
const b = (c: React.ReactNode) => <strong className="text-white">{c}</strong>;
const correo = () => <Correo />;
const privacidad = (c: React.ReactNode) => (
  <Link href="/privacidad" className="text-ng-celeste hover:underline">
    {c}
  </Link>
);
function enlace(href: string) {
  return function EnlaceRico(c: React.ReactNode) {
    return <Enlace href={href}>{c}</Enlace>;
  };
}

export default function TerminosPage() {
  const t = useTranslations("legalTerminos");
  return (
    <LegalLayout titulo={t("titulo")} actualizado={ACTUALIZADO}>
      <Seccion titulo={t("s1.titulo")}>
        <p>{t("s1.p1", { responsable: RESPONSABLE })}</p>
        <p>{t("s1.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s2.titulo")}>
        <p>{t("s2.p1")}</p>
        <p>{t("s2.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s3.titulo")}>
        <p>{t("s3.p1")}</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t.rich("s3.creador", { b })}</li>
          <li>{t.rich("s3.equipo", { b })}</li>
        </ul>
        <p>{t("s3.p2")}</p>
        <p>{t("s3.p3")}</p>
      </Seccion>

      <Seccion titulo={t("s4.titulo")}>
        <p>{t("s4.p1")}</p>
        <p>{t("s4.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s5.titulo")}>
        <p>{t.rich("s5.p1", { correo })}</p>
        <p>{t("s5.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s6.titulo")}>
        <p>{t("s6.p1")}</p>
        <p>{t.rich("s6.p2", { privacidad })}</p>
      </Seccion>

      <Seccion titulo={t("s7.titulo")}>
        <p>{t("s7.p1")}</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t("s7.li1")}</li>
          <li>{t("s7.li2")}</li>
          <li>{t("s7.li3")}</li>
          <li>{t("s7.li4")}</li>
          <li>{t("s7.li5")}</li>
          <li>{t("s7.li6")}</li>
          <li>{t("s7.li7")}</li>
        </ul>
      </Seccion>

      <Seccion titulo={t("s8.titulo")}>
        <p>{t("s8.p1")}</p>
        <p>{t("s8.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s9.titulo")}>
        <p>{t("s9.p1")}</p>
        <p>
          {t.rich("s9.p2", {
            ytTerminos: enlace("https://www.youtube.com/t/terms"),
            googlePrivacidad: enlace("https://policies.google.com/privacy"),
          })}
        </p>
        <p>
          {t.rich("s9.p3", {
            ttTerminos: enlace("https://www.tiktok.com/legal/terms-of-service"),
            ttMusica: enlace("https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"),
            ttMarca: enlace("https://www.tiktok.com/legal/page/global/bc-policy/en"),
          })}
        </p>
        <p>{t("s9.p4")}</p>
      </Seccion>

      <Seccion titulo={t("s10.titulo")}>
        <p>{t("s10.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s11.titulo")}>
        <p>{t("s11.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s12.titulo")}>
        <p>{t("s12.p1", { responsable: RESPONSABLE })}</p>
      </Seccion>

      <Seccion titulo={t("s13.titulo")}>
        <p>{t("s13.p1")}</p>
        <p>{t.rich("s13.p2", { correo, privacidad })}</p>
      </Seccion>

      <Seccion titulo={t("s14.titulo")}>
        <p>{t("s14.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s15.titulo")}>
        <p>{t.rich("s15.p1", { correo })}</p>
      </Seccion>
    </LegalLayout>
  );
}
