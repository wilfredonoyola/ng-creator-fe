import type { Metadata } from "next";
import { LegalLayout, Seccion } from "@/components/LegalLayout";

/**
 * COMPLETAR antes de someter la app a revisión de Meta: son los únicos datos
 * que no se pueden deducir del código.
 */
const RESPONSABLE = "[Razón social o nombre del responsable]";
const CONTACTO = "[correo de contacto]";

const ACTUALIZADO = "5 de agosto de 2026";

export const metadata: Metadata = {
  title: "Política de privacidad — NG Video Creator",
  description:
    "Qué datos trata NG Video Creator, con qué finalidad, con quién se comparten y cómo solicitar su eliminación.",
};

export default function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de privacidad" actualizado={ACTUALIZADO}>
      <Seccion titulo="1. Quién es responsable">
        <p>
          NG Video Creator (en adelante, «la plataforma») es una herramienta
          interna de producción y distribución de contenido de video, operada por{" "}
          {RESPONSABLE}. Para cualquier consulta sobre esta política o sobre tus
          datos, escribí a {CONTACTO}.
        </p>
        <p>
          La plataforma no está dirigida al público general: la usan las personas
          autorizadas del equipo para producir y publicar videos en páginas de
          Facebook que el propio equipo administra.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <p>
          <strong className="text-white">Datos de cuenta.</strong> Correo
          electrónico y credenciales de acceso, gestionadas por AWS Cognito. En
          nuestra base guardamos el identificador de usuario de Cognito, el
          correo, el nombre si está disponible, los roles asignados, si la cuenta
          está activa y la fecha del último acceso. No almacenamos contraseñas.
        </p>
        <p>
          <strong className="text-white">Datos de la integración con
          Facebook.</strong> Cuando una persona con rol de administrador conecta
          una cuenta de Facebook, recibimos y guardamos: su identificador y
          nombre de usuario de Facebook, los permisos concedidos, un token de
          acceso de usuario, y —para cada página que administra— su
          identificador, nombre, categoría, imagen y un token de acceso de
          página. Los tokens se guardan cifrados.
        </p>
        <p>
          <strong className="text-white">Contenido de producción.</strong> Clips
          de video cargados o descargados desde enlaces públicos, notas de voz,
          transcripciones, guiones generados, audio de narración, videos finales
          e imágenes derivadas de ellos.
        </p>
        <p>
          <strong className="text-white">Datos operativos.</strong> Registros de
          cada expediente y de cada intento de publicación, con su resultado,
          mensajes de error y marcas de tiempo.
        </p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <p>
          Únicamente para operar la plataforma: autenticar el acceso, controlar
          qué puede hacer cada persona según su rol, generar el contenido de
          video, publicarlo en las páginas de Facebook autorizadas y permitir
          diagnosticar fallos del proceso.
        </p>
        <p>
          No vendemos datos, no los cedemos a terceros con fines comerciales, no
          construimos perfiles publicitarios y no usamos los datos para
          entrenar modelos propios.
        </p>
      </Seccion>

      <Seccion titulo="4. Con quién se comparten">
        <p>
          Para funcionar, la plataforma envía datos a los siguientes proveedores,
          cada uno con su propia política de privacidad:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Amazon Web Services (Cognito)</strong>{" "}
            — autenticación de las cuentas.
          </li>
          <li>
            <strong className="text-white">MongoDB</strong> — base de datos de la
            aplicación.
          </li>
          <li>
            <strong className="text-white">Bunny.net</strong> — almacenamiento y
            entrega de los archivos de video, audio e imagen.
          </li>
          <li>
            <strong className="text-white">OpenAI</strong> — transcripción de las
            notas de voz, análisis de fotogramas del video, generación del guion
            y síntesis de la narración.
          </li>
          <li>
            <strong className="text-white">ElevenLabs</strong> — síntesis de voz,
            solo si está configurada como alternativa.
          </li>
          <li>
            <strong className="text-white">Meta Platforms</strong> — publicación
            del contenido en las páginas de Facebook autorizadas.
          </li>
        </ul>
        <p>
          El proveedor del modelo de lenguaje es configurable, por lo que puede
          diferir del indicado arriba según la configuración vigente.
        </p>
      </Seccion>

      <Seccion titulo="5. Permisos de Facebook y para qué se usan">
        <p>
          Al conectar una cuenta de Facebook solicitamos estos permisos, y los
          usamos exclusivamente para lo indicado:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <code className="text-[13px] text-[#0FED9D]">pages_show_list</code> —
            listar las páginas que administrás, para que puedas elegir cuáles
            habilitar como destino.
          </li>
          <li>
            <code className="text-[13px] text-[#0FED9D]">
              pages_read_engagement
            </code>{" "}
            — leer los datos básicos de esas páginas, como nombre, categoría e
            imagen.
          </li>
          <li>
            <code className="text-[13px] text-[#0FED9D]">
              pages_manage_posts
            </code>{" "}
            — publicar el contenido que apruebes, como reel, historia o imagen.
          </li>
          <li>
            <code className="text-[13px] text-[#0FED9D]">read_insights</code> —
            leer las estadísticas de las publicaciones de esas páginas (alcance e
            impresiones), para ordenar el historial por rendimiento y ver qué
            contenido funcionó mejor. Es opcional: si no lo concedés, todo lo
            demás sigue funcionando.
          </li>
        </ul>
        <p>
          Solo publicamos en las páginas que un administrador habilitó de forma
          explícita, y solo cuando alguien del equipo lo indica. La plataforma no
          publica de manera automática ni programada.
        </p>
      </Seccion>

      <Seccion titulo="6. Cuánto tiempo conservamos los datos">
        <p>
          Los datos de cuenta se conservan mientras la cuenta exista. El
          contenido de producción y los registros de publicación se conservan
          mientras sean necesarios para la operación. Los tokens de Facebook se
          conservan hasta que expiran, se revocan o se desconecta la cuenta.
        </p>
      </Seccion>

      <Seccion titulo="7. Seguridad">
        <p>
          El acceso exige autenticación y está limitado por roles. Los tokens de
          acceso de Facebook se guardan cifrados con AES-256-GCM y no se exponen
          en ninguna interfaz ni respuesta de la API. La comunicación con los
          proveedores se hace sobre HTTPS.
        </p>
        <p>
          Ninguna medida ofrece seguridad absoluta, pero estas son las que
          aplicamos.
        </p>
      </Seccion>

      <Seccion titulo="8. Cómo revocar el acceso a Facebook">
        <p>Podés cortar el acceso de dos maneras, y conviene usar las dos:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            Desde la plataforma, en <em>Integraciones</em>, con la opción
            «Desconectar»: deja de haber tokens utilizables y se deshabilitan las
            páginas como destino.
          </li>
          <li>
            Desde Facebook, en{" "}
            <em>
              Configuración y privacidad → Configuración → Apps y sitios web
            </em>
            , eliminando la app. Esto invalida los tokens del lado de Meta.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="9. Eliminación de datos">
        <p>
          Para solicitar la eliminación de tus datos, escribí a {CONTACTO} desde
          la dirección asociada a tu cuenta, indicando qué querés eliminar. Al
          recibirlo procedemos a:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            eliminar tu usuario de la plataforma y de AWS Cognito, junto con los
            roles asociados;
          </li>
          <li>
            eliminar la conexión de Facebook y todos los tokens vinculados a
            ella;
          </li>
          <li>
            eliminar, si lo pedís, el contenido de producción asociado a tu
            cuenta.
          </li>
        </ul>
        <p>
          El contenido ya publicado en una página de Facebook no se elimina desde
          acá: hay que borrarlo en la página, porque a partir de la publicación
          queda bajo el control de Meta y de los administradores de esa página.
        </p>
      </Seccion>

      <Seccion titulo="10. Cambios en esta política">
        <p>
          Si cambia lo que hacemos con los datos, actualizamos esta página y su
          fecha de última modificación.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
