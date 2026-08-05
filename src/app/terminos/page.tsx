import type { Metadata } from "next";
import { LegalLayout, Seccion } from "@/components/LegalLayout";

/** COMPLETAR antes de someter la app a revisión de Meta. */
const RESPONSABLE = "[Razón social o nombre del responsable]";
const CONTACTO = "[correo de contacto]";
const JURISDICCION = "[país o jurisdicción aplicable]";

const ACTUALIZADO = "5 de agosto de 2026";

export const metadata: Metadata = {
  title: "Términos del servicio — NG Video Creator",
  description:
    "Condiciones de uso de NG Video Creator: acceso, contenido, integración con Facebook y responsabilidades.",
};

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos del servicio" actualizado={ACTUALIZADO}>
      <Seccion titulo="1. Objeto">
        <p>
          NG Video Creator (en adelante, «la plataforma») es una herramienta de
          producción y distribución de contenido de video operada por{" "}
          {RESPONSABLE}. Permite convertir un clip y una nota de voz en un video
          narrado, revisarlo y publicarlo en páginas de Facebook autorizadas.
        </p>
        <p>
          Al usar la plataforma aceptás estos términos. Si no estás de acuerdo,
          no la uses.
        </p>
      </Seccion>

      <Seccion titulo="2. Acceso y cuentas">
        <p>
          El acceso es por invitación y está restringido a las personas
          autorizadas del equipo. Cada cuenta es personal: sos responsable de
          mantener tus credenciales en resguardo y de la actividad realizada
          desde tu cuenta.
        </p>
        <p>
          Los permisos dependen del rol asignado. El rol de administrador habilita
          la gestión de integraciones, páginas de destino y usuarios.
        </p>
      </Seccion>

      <Seccion titulo="3. Uso aceptable">
        <p>Al usar la plataforma te comprometés a no:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            publicar contenido sobre el que no tengas derechos suficientes;
          </li>
          <li>
            publicar contenido ilícito, engañoso, difamatorio, discriminatorio o
            que incite a la violencia;
          </li>
          <li>
            usar la plataforma para publicar en páginas que no estés autorizado a
            administrar;
          </li>
          <li>
            intentar eludir los controles de acceso o los límites de uso;
          </li>
          <li>
            infringir las políticas de las plataformas de destino ni de los
            proveedores involucrados.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="4. Contenido y derechos de terceros">
        <p>
          El contenido que cargás sigue siendo tuyo o de quien corresponda. La
          plataforma solo lo procesa para producir y publicar el video.
        </p>
        <p>
          Sos responsable de contar con los derechos necesarios sobre cada clip
          antes de publicarlo. La plataforma incluye un registro de licencias y
          evidencias para documentar esos permisos, pero es una herramienta de
          registro: no valida por sí sola la legitimidad de una licencia ni
          sustituye el consentimiento del titular.
        </p>
        <p>
          El contenido se genera parcialmente con modelos automáticos. Puede
          contener errores o afirmaciones inexactas, por lo que debe revisarse
          antes de publicar. La revisión humana previa a la publicación es parte
          del flujo por diseño y no debe omitirse.
        </p>
      </Seccion>

      <Seccion titulo="5. Integración con Facebook">
        <p>
          La publicación en páginas de Facebook se realiza mediante la API de
          Meta y requiere que un administrador conecte una cuenta con permisos
          sobre esas páginas. Solo se publica en las páginas habilitadas de forma
          explícita.
        </p>
        <p>
          El uso de esa integración está sujeto además a los términos y políticas
          de Meta. Meta puede modificar, limitar o revocar el acceso a su API en
          cualquier momento, lo que puede interrumpir la función de publicación
          sin que dependa de nosotros.
        </p>
        <p>
          Podés revocar el acceso en cualquier momento desde la plataforma o
          desde la configuración de tu cuenta de Facebook.
        </p>
      </Seccion>

      <Seccion titulo="6. Disponibilidad">
        <p>
          La plataforma se ofrece «tal como está». No garantizamos
          disponibilidad continua, ausencia de errores ni resultados
          determinados. Puede haber interrupciones por mantenimiento, fallos de
          proveedores externos o cambios en sus APIs.
        </p>
        <p>
          Las funciones que dependen de proveedores externos —almacenamiento,
          modelos de lenguaje, síntesis de voz, publicación— pueden degradarse o
          dejar de operar si esos servicios cambian sus condiciones, sus precios
          o su disponibilidad.
        </p>
      </Seccion>

      <Seccion titulo="7. Límite de responsabilidad">
        <p>
          En la medida permitida por la ley, {RESPONSABLE} no responde por daños
          indirectos, lucro cesante, pérdida de datos ni por las consecuencias de
          contenido publicado a través de la plataforma. La responsabilidad por
          el contenido publicado recae en quien lo aprueba y lo publica.
        </p>
      </Seccion>

      <Seccion titulo="8. Suspensión y baja">
        <p>
          Podemos suspender o dar de baja una cuenta que incumpla estos términos,
          que comprometa la seguridad de la plataforma o que ponga en riesgo el
          acceso a las plataformas de destino.
        </p>
        <p>
          Podés solicitar la baja de tu cuenta escribiendo a {CONTACTO}. El
          tratamiento de tus datos tras la baja se rige por la{" "}
          <a href="/privacidad" className="text-[#0FED9D] hover:underline">
            política de privacidad
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="9. Cambios en los términos">
        <p>
          Podemos actualizar estos términos. Los cambios relevantes se reflejan
          en esta página junto con su fecha de última modificación. El uso
          continuado después de una actualización implica su aceptación.
        </p>
      </Seccion>

      <Seccion titulo="10. Ley aplicable y contacto">
        <p>
          Estos términos se rigen por la legislación de {JURISDICCION}. Para
          cualquier consulta, escribí a {CONTACTO}.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
