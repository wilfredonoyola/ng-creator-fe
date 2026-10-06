import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LegalLayout, Seccion } from "@/components/LegalLayout";
import { ACTUALIZADO, CONTACTO, RESPONSABLE } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legalPrivacidad");
  return {
    title: t("meta.titulo"),
    description: t("meta.descripcion"),
    alternates: { canonical: "/privacidad" },
  };
}

/** Un permiso tal como lo nombra la red. */
const Permiso = ({ children }: { children: React.ReactNode }) => (
  <code className="text-[13px] text-ng-teal">{children}</code>
);

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

/** Las etiquetas que usan los textos de la política (ver legalPrivacidad.json). */
const b = (c: React.ReactNode) => <strong className="text-white">{c}</strong>;
const em = (c: React.ReactNode) => <em>{c}</em>;
const correo = () => <Correo />;
function enlace(href: string) {
  return function EnlaceRico(c: React.ReactNode) {
    return <Enlace href={href}>{c}</Enlace>;
  };
}

export default function PrivacidadPage() {
  const t = useTranslations("legalPrivacidad");
  return (
    <LegalLayout titulo={t("titulo")} actualizado={ACTUALIZADO}>
      <Seccion titulo={t("s1.titulo")}>
        <p>{t("s1.p1", { responsable: RESPONSABLE })}</p>
        <p>{t.rich("s1.p2", { correo })}</p>
      </Seccion>

      <Seccion titulo={t("s2.titulo")}>
        <p>{t.rich("s2.cuenta", { b })}</p>
        <p>{t.rich("s2.contenido", { b })}</p>
        <p>{t.rich("s2.pago", { b })}</p>
        <p>{t.rich("s2.redes", { b })}</p>
        <p>{t.rich("s2.uso", { b })}</p>
        <p>{t.rich("s2.movil", { b })}</p>
      </Seccion>

      <Seccion titulo={t("s3.titulo")}>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t("s3.li1")}</li>
          <li>{t("s3.li2")}</li>
          <li>{t("s3.li3")}</li>
          <li>{t("s3.li4")}</li>
          <li>{t("s3.li5")}</li>
          <li>{t("s3.li6")}</li>
        </ul>
        <p>{t("s3.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s4.titulo")}>
        <p>{t("s4.p1")}</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t.rich("s4.aws", { b })}</li>
          <li>{t.rich("s4.mongo", { b })}</li>
          <li>{t.rich("s4.bunny", { b })}</li>
          <li>{t.rich("s4.openai", { b })}</li>
          <li>{t.rich("s4.elevenlabs", { b })}</li>
          <li>{t.rich("s4.servidores", { b })}</li>
          <li>{t.rich("s4.lemon", { b })}</li>
          <li>{t.rich("s4.meta", { b })}</li>
          <li>{t.rich("s4.google", { b, enlace: enlace("https://policies.google.com/privacy") })}</li>
          <li>{t.rich("s4.tiktok", { b, enlace: enlace("https://www.tiktok.com/legal/privacy-policy") })}</li>
          <li>{t.rich("s4.expo", { b })}</li>
        </ul>
        <p>{t("s4.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s5.titulo")}>
        <p>{t("s5.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s6.titulo")}>
        <p>{t("s6.p1")}</p>
        <p>
          <strong className="text-white">Facebook</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>pages_show_list</Permiso> — {t("s6.fbPagesShowList")}
          </li>
          <li>
            <Permiso>pages_read_engagement</Permiso> — {t("s6.fbPagesReadEngagement")}
          </li>
          <li>
            <Permiso>pages_manage_posts</Permiso> — {t("s6.fbPagesManagePosts")}
          </li>
          <li>
            <Permiso>read_insights</Permiso> — {t("s6.fbReadInsights")}
          </li>
        </ul>
        <p>
          <strong className="text-white">YouTube</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>youtube.upload</Permiso> — {t("s6.ytUpload")}
          </li>
          <li>
            <Permiso>youtube.readonly</Permiso> — {t("s6.ytReadonly")}
          </li>
        </ul>
        <p>{t.rich("s6.ytTerminos", { enlace: enlace("https://www.youtube.com/t/terms") })}</p>
        <p>
          <strong className="text-white">TikTok</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>user.info.basic</Permiso> — {t("s6.ttUserInfo")}
          </li>
          <li>
            <Permiso>video.publish</Permiso> — {t("s6.ttVideoPublish")}
          </li>
        </ul>
        <p>{t("s6.p2")}</p>
      </Seccion>

      <Seccion titulo={t("s7.titulo")}>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t("s7.li1")}</li>
          <li>{t("s7.li2")}</li>
          <li>{t("s7.li3")}</li>
          <li>{t("s7.li4")}</li>
          <li>{t("s7.li5")}</li>
        </ul>
      </Seccion>

      <Seccion titulo={t("s8.titulo")}>
        <p>{t("s8.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s9.titulo")}>
        <p>{t.rich("s9.p1", { em })}</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t.rich("s9.facebook", { b, em })}</li>
          <li>{t.rich("s9.youtube", { b, enlace: enlace("https://myaccount.google.com/permissions") })}</li>
          <li>{t.rich("s9.tiktok", { b, em })}</li>
        </ul>
      </Seccion>

      <Seccion titulo={t("s10.titulo")}>
        <p>{t("s10.p1")}</p>
        <p>{t.rich("s10.p2", { em })}</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>{t("s10.li1")}</li>
          <li>{t.rich("s10.li2", { correo })}</li>
          <li>{t("s10.li3")}</li>
          <li>{t.rich("s10.li4", { em })}</li>
        </ul>
        <p>{t.rich("s10.p3", { correo })}</p>
        <p>{t("s10.p4")}</p>
      </Seccion>

      <Seccion titulo={t("s11.titulo")}>
        <p>{t("s11.p1")}</p>
      </Seccion>

      <Seccion titulo={t("s12.titulo")}>
        <p>{t("s12.p1")}</p>
      </Seccion>
    </LegalLayout>
  );
}
