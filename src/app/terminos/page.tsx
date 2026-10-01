import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, Seccion } from "@/components/LegalLayout";
import { ACTUALIZADO, CONTACTO, JURISDICCION, RESPONSABLE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos del servicio",
  description:
    "Condiciones de uso de NG Creator: cuentas, planes y precios, cobro mensual, cancelación, contenido, redes conectadas y responsabilidades.",
  alternates: { canonical: "/terminos" },
};

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

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos del servicio" actualizado={ACTUALIZADO}>
      <Seccion titulo="1. Qué es el servicio">
        <p>
          NG Creator (en adelante, «el servicio») es una plataforma de {RESPONSABLE} para subir episodios de podcast en
          video, transcribirlos, encontrar con IA los momentos para clips, editarlos en equipo y publicarlos en redes
          sociales. Se usa desde la web y desde las apps para iPhone y Android.
        </p>
        <p>Al crear una cuenta o usar el servicio aceptás estos términos. Si no estás de acuerdo, no lo uses.</p>
      </Seccion>

      <Seccion titulo="2. Cuentas">
        <p>
          Para usar el servicio tenés que ser mayor de 18 años y dar datos verdaderos. Cada cuenta es personal: sos
          responsable de cuidar tu contraseña y de lo que se haga desde tu cuenta.
        </p>
        <p>
          Quien crea una marca es su propietario y responde por ella: invita a las personas, les asigna un rol y
          paga la suscripción. Las personas invitadas usan el servicio dentro de lo que su plan y su rol permiten.
        </p>
      </Seccion>

      <Seccion titulo="3. Planes y precios">
        <p>El servicio se ofrece por suscripción mensual, en dólares de los Estados Unidos:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Creador — US$19.99 al mes:</strong> 1 persona, 1 marca y hasta 12
            episodios por periodo de cobro.
          </li>
          <li>
            <strong className="text-white">Equipo — US$49.99 al mes:</strong> hasta 5 personas, 1 marca y hasta 16
            episodios por periodo de cobro.
          </li>
        </ul>
        <p>
          En los dos planes, cada episodio puede durar hasta 3 horas, y los clips y exportaciones no tienen límite
          dentro de un uso razonable. Los episodios que no se usan en un periodo no pasan al siguiente. Los impuestos
          que correspondan se indican al momento de pagar.
        </p>
        <p>
          Podemos cambiar los precios o lo que incluye cada plan. Si un cambio te afecta, te avisamos por correo con
          al menos 30 días de anticipación y rige desde el cobro siguiente a ese plazo; si no estás de acuerdo, podés
          cancelar antes.
        </p>
      </Seccion>

      <Seccion titulo="4. Pago y renovación">
        <p>
          El pago se hace con tarjeta a través de Wompi, que procesa el cobro bajo sus propios términos. Al suscribirte
          autorizás un cobro automático cada mes, el mismo día en que te suscribiste, hasta que canceles. La
          suscripción se renueva sola al confirmarse cada cobro.
        </p>
        <p>
          Si cambiás de plan, el nuevo precio y sus límites rigen desde el próximo cobro, salvo que al cambiar se
          indique otra cosa.
        </p>
      </Seccion>

      <Seccion titulo="5. Cancelación y reembolsos">
        <p>
          Podés cancelar cuando quieras, sin penalidad, desde la web o escribiendo a <Correo />. Al cancelar no se
          hacen más cobros y el plan sigue activo hasta el final del periodo ya pagado.
        </p>
        <p>
          Los pagos no son reembolsables, ni por periodos parciales ni por episodios no usados, salvo que la ley
          aplicable disponga otra cosa. Si se te cobró por error o dos veces por el mismo periodo, escribinos y te
          devolvemos ese importe.
        </p>
      </Seccion>

      <Seccion titulo="6. Si un pago no entra">
        <p>
          Si un cobro mensual no se puede hacer, te avisamos por correo y tenés 3 días para actualizar el pago. Pasado
          ese plazo la cuenta queda en solo lectura: podés entrar, ver y descargar lo que ya hiciste, pero no subir
          episodios, procesarlos ni renderizar clips. Se reactiva sola en cuanto entra el pago.
        </p>
        <p>
          Si la cuenta sigue sin pago 90 días, podemos eliminar su contenido, con aviso previo por correo (ver la{" "}
          <Link href="/privacidad" className="text-ng-celeste hover:underline">
            política de privacidad
          </Link>
          ).
        </p>
      </Seccion>

      <Seccion titulo="7. Uso aceptable">
        <p>Al usar el servicio te comprometés a no:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>subir o publicar contenido sobre el que no tengas derechos suficientes;</li>
          <li>
            publicar a personas que aparecen o hablan en un episodio sin su autorización, cuando la ley la exija;
          </li>
          <li>publicar contenido ilícito, engañoso, difamatorio, discriminatorio o que incite a la violencia;</li>
          <li>publicar en cuentas o páginas que no estés autorizado a administrar;</li>
          <li>compartir una cuenta entre varias personas, revender el servicio o eludir los límites de tu plan;</li>
          <li>intentar vulnerar la seguridad del servicio o sobrecargarlo;</li>
          <li>infringir las políticas de las redes de destino o de los proveedores del servicio.</li>
        </ul>
      </Seccion>

      <Seccion titulo="8. Tu contenido">
        <p>
          Tu contenido sigue siendo tuyo. Nos das permiso para almacenarlo, procesarlo y publicarlo solo en la medida
          necesaria para prestarte el servicio y solo donde vos lo indiques. Ese permiso termina cuando se elimina el
          contenido.
        </p>
        <p>
          La transcripción, los momentos sugeridos y los textos se generan con modelos de IA y pueden tener errores:
          revisá cada clip antes de publicarlo. Nada se publica sin que una persona lo apruebe, y la responsabilidad
          por lo publicado es de quien lo aprueba y lo publica.
        </p>
      </Seccion>

      <Seccion titulo="9. Redes conectadas">
        <p>
          La publicación usa las APIs de cada red y requiere que un administrador conecte una cuenta con permisos
          sobre ella. Solo se publica en las cuentas y páginas habilitadas de forma explícita. El uso de cada
          integración está sujeto además a los términos de esa red, que puede modificar, limitar o revocar el acceso a
          su API en cualquier momento, lo que puede interrumpir la publicación sin que dependa de nosotros.
        </p>
        <p>
          Al publicar en YouTube a través del servicio aceptás los{" "}
          <Enlace href="https://www.youtube.com/t/terms">Términos del servicio de YouTube</Enlace>, y tus datos se
          tratan también según la{" "}
          <Enlace href="https://policies.google.com/privacy">política de privacidad de Google</Enlace>.
        </p>
        <p>
          Al publicar en TikTok aceptás los{" "}
          <Enlace href="https://www.tiktok.com/legal/terms-of-service">Términos del servicio de TikTok</Enlace> y su{" "}
          <Enlace href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">
            Confirmación de uso de música
          </Enlace>
          ; si declarás el video como contenido de marca, también su{" "}
          <Enlace href="https://www.tiktok.com/legal/page/global/bc-policy/en">Política de contenido de marca</Enlace>
          . Declarar con exactitud si un video es contenido comercial es responsabilidad de quien lo publica.
        </p>
        <p>
          Las redes pueden limitar cuánto se publica por día y por cuenta, y mientras una integración no esté
          aprobada por la red, puede publicar solo de forma privada. Esos límites son de cada red y no dependen de
          nosotros.
        </p>
      </Seccion>

      <Seccion titulo="10. Apps móviles">
        <p>
          Las apps para iPhone y Android se descargan de la App Store y de Google Play y se usan con la misma cuenta
          de la web. Las suscripciones se contratan y se administran desde la web; las apps no venden planes. Apple y
          Google no son parte de estos términos ni responden por el servicio.
        </p>
      </Seccion>

      <Seccion titulo="11. Disponibilidad">
        <p>
          El servicio se ofrece «tal como está». Trabajamos para que funcione de forma continua, pero no garantizamos
          que no tenga interrupciones o errores: puede haberlos por mantenimiento, por fallos o cambios de los
          proveedores externos, o por picos de uso que demoren el procesamiento.
        </p>
      </Seccion>

      <Seccion titulo="12. Límite de responsabilidad">
        <p>
          En la medida permitida por la ley, {RESPONSABLE} no responde por daños indirectos, lucro cesante, pérdida de
          datos ni por las consecuencias del contenido publicado a través del servicio. En cualquier caso, nuestra
          responsabilidad total no supera lo que hayas pagado por el servicio en los tres meses anteriores al hecho
          que la origine.
        </p>
      </Seccion>

      <Seccion titulo="13. Suspensión y baja">
        <p>
          Podemos suspender o dar de baja una cuenta que incumpla estos términos, que comprometa la seguridad del
          servicio o que ponga en riesgo el acceso a las redes de destino. Salvo casos graves o urgentes, te avisamos
          antes y te damos la oportunidad de corregirlo.
        </p>
        <p>
          Podés dar de baja tu cuenta escribiendo a <Correo />. Qué pasa con tus datos después se explica en la{" "}
          <Link href="/privacidad" className="text-ng-celeste hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </Seccion>

      <Seccion titulo="14. Cambios en los términos">
        <p>
          Podemos actualizar estos términos. Los cambios se publican en esta página con su fecha, y si son importantes
          te avisamos por correo al menos 15 días antes de que rijan. Seguir usando el servicio después implica
          aceptarlos.
        </p>
      </Seccion>

      <Seccion titulo="15. Ley aplicable y contacto">
        <p>
          Estos términos se rigen por las leyes de {JURISDICCION}. Para cualquier consulta, escribí a <Correo />.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
