import type { Metadata } from "next";
import { LegalLayout, Seccion } from "@/components/LegalLayout";
import { ACTUALIZADO, CONTACTO, RESPONSABLE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos trata NG Creator, para qué, con qué proveedores se comparten, cuánto se conservan y cómo pedir su eliminación.",
  alternates: { canonical: "/privacidad" },
};

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

export default function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de privacidad" actualizado={ACTUALIZADO}>
      <Seccion titulo="1. Quién es responsable">
        <p>
          NG Creator (en adelante, «el servicio») es una plataforma para convertir episodios de podcast en video en
          clips para redes sociales, editarlos en equipo y publicarlos. La opera {RESPONSABLE}, con domicilio en El
          Salvador, que es la responsable de los datos que se describen aquí. El servicio se usa desde la web
          (creator.ngstudios.co) y desde las apps para iPhone y Android.
        </p>
        <p>
          Para cualquier consulta sobre esta política o sobre tus datos, escribí a <Correo />.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <p>
          <strong className="text-white">Datos de cuenta.</strong> Nombre, correo electrónico y contraseña. La
          contraseña la gestiona Amazon Web Services (Cognito) y nunca la guardamos nosotros. En nuestra base
          guardamos el identificador de la cuenta, el correo, el nombre, las marcas a las que pertenecés, tu rol en
          cada una y la fecha del último acceso.
        </p>
        <p>
          <strong className="text-white">Contenido que subís y generás.</strong> Los videos de los episodios, el
          audio que se extrae de ellos, la transcripción palabra por palabra, los momentos que sugiere la IA con su
          puntaje y motivo, los clips y sus ediciones (encuadre, textos, subtítulos) y los videos terminados. Las
          personas que aparecen o hablan en ese contenido son parte de él: es tu responsabilidad contar con su
          autorización (ver los Términos).
        </p>
        <p>
          <strong className="text-white">Datos de pago.</strong> Los pagos los procesa Wompi. Los datos de la tarjeta
          se ingresan en la página de Wompi y los guarda Wompi: nosotros nunca recibimos ni guardamos el número
          completo, la fecha de vencimiento ni el código de seguridad. De cada suscripción guardamos el plan, su
          estado, las fechas de cobro y vencimiento, el monto y los identificadores que Wompi nos devuelve para cada
          cobro.
        </p>
        <p>
          <strong className="text-white">Datos de las redes conectadas.</strong> Cuando un administrador conecta una
          cuenta de Facebook, recibimos su identificador y nombre de usuario, los permisos concedidos, un token de
          acceso de usuario y, por cada página que administra, su identificador, nombre, categoría, imagen y un
          token de acceso de página. Cuando el propietario de una marca conecta un canal de YouTube, recibimos
          de Google el identificador, el nombre y la imagen del canal, los permisos concedidos y un token de
          actualización. Cuando conecta una cuenta de TikTok, recibimos de TikTok su identificador para nuestra
          app (open_id), el nombre visible, el nombre de usuario, la imagen de perfil, los permisos concedidos, un
          token de acceso y uno de actualización, y lo que la cuenta permite al publicar (opciones de privacidad,
          si admite comentarios, dúos y stitch, y la duración máxima de sus videos). Todos los tokens se guardan
          cifrados. No leemos los videos, los comentarios, los seguidores ni los mensajes de esas cuentas. Si el
          servicio suma otras redes, esta política se actualizará con lo que se recibe de cada una antes de
          habilitarlas.
        </p>
        <p>
          <strong className="text-white">Datos de uso y operación.</strong> Registros de cada episodio, trabajo de
          procesamiento y publicación, con su estado, errores y marcas de tiempo, y el consumo de cada episodio (por
          ejemplo, minutos transcritos) para controlar los límites de cada plan.
        </p>
        <p>
          <strong className="text-white">En la app móvil.</strong> La sesión se guarda en el almacenamiento seguro
          del teléfono (Keychain en iPhone, Keystore en Android). La app no accede a tu ubicación, contactos,
          micrófono ni cámara, no muestra publicidad y no te rastrea entre apps o sitios de terceros.
        </p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Crear y proteger tu cuenta, y controlar qué puede hacer cada persona según su rol.</li>
          <li>Transcribir tus episodios, sugerir momentos, renderizar los clips y publicarlos donde lo indiques.</li>
          <li>Cobrar la suscripción, aplicar los límites de tu plan y avisarte de pagos y vencimientos.</li>
          <li>Mandarte correos necesarios para el servicio: invitaciones, códigos de acceso y avisos de la cuenta.</li>
          <li>Darte soporte, diagnosticar fallos y prevenir abusos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias.</li>
        </ul>
        <p>
          No vendemos datos, no los cedemos a terceros con fines comerciales, no construimos perfiles publicitarios
          y no usamos tu contenido para entrenar modelos de IA propios.
        </p>
      </Seccion>

      <Seccion titulo="4. Con quién se comparten">
        <p>
          Para funcionar, el servicio usa estos proveedores, cada uno con su propia política de privacidad. Solo
          reciben lo necesario para su parte del trabajo:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Amazon Web Services</strong> — autenticación de las cuentas (Cognito) y
            envío de correos (SES).
          </li>
          <li>
            <strong className="text-white">MongoDB Atlas</strong> — base de datos.
          </li>
          <li>
            <strong className="text-white">Bunny.net</strong> — almacenamiento y reproducción de los videos, el
            audio y las imágenes.
          </li>
          <li>
            <strong className="text-white">OpenAI</strong> — transcripción del audio de los episodios y análisis de
            la transcripción para sugerir momentos. Según sus condiciones para la API, OpenAI no usa estos datos para
            entrenar sus modelos.
          </li>
          <li>
            <strong className="text-white">ElevenLabs</strong> — síntesis de voz, solo en las funciones que la usan.
          </li>
          <li>
            <strong className="text-white">DigitalOcean, Contabo y Vercel</strong> — servidores donde corren la
            aplicación, el procesamiento de video y la web.
          </li>
          <li>
            <strong className="text-white">Wompi</strong> — cobro de la suscripción.
          </li>
          <li>
            <strong className="text-white">Meta Platforms</strong> — publicación en las páginas de Facebook
            autorizadas.
          </li>
          <li>
            <strong className="text-white">Google (YouTube API Services)</strong> — publicación en los canales de
            YouTube autorizados. Google trata esos datos según su{" "}
            <Enlace href="https://policies.google.com/privacy">política de privacidad</Enlace>.
          </li>
          <li>
            <strong className="text-white">TikTok</strong> — publicación en las cuentas de TikTok autorizadas, según
            su <Enlace href="https://www.tiktok.com/legal/privacy-policy">política de privacidad</Enlace>.
          </li>
          <li>
            <strong className="text-white">Expo</strong> — distribución de las actualizaciones de la app móvil.
          </li>
        </ul>
        <p>
          Varios de estos proveedores están fuera de El Salvador, principalmente en Estados Unidos y Europa, así que
          tus datos pueden procesarse en esos países. También podemos compartir datos si lo exige una autoridad
          competente conforme a la ley.
        </p>
      </Seccion>

      <Seccion titulo="5. Equipos y marcas">
        <p>
          El contenido se organiza por marca. Quien crea una marca es su propietario: puede invitar personas, darles
          un rol y quitarlas. Las personas de una marca ven y editan el contenido de esa marca según su rol, y no
          ven el de otras marcas. Si alguien te invita, el propietario de esa marca puede ver lo que hagas dentro de
          ella.
        </p>
      </Seccion>

      <Seccion titulo="6. Permisos de las redes y para qué se usan">
        <p>
          Al conectar cada red solicitamos estos permisos, y los usamos exclusivamente para lo indicado.
        </p>
        <p>
          <strong className="text-white">Facebook</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>pages_show_list</Permiso> — listar las páginas que administrás, para que puedas elegir cuáles
            habilitar como destino.
          </li>
          <li>
            <Permiso>pages_read_engagement</Permiso> — leer los datos básicos de esas páginas, como nombre,
            categoría e imagen.
          </li>
          <li>
            <Permiso>pages_manage_posts</Permiso> — publicar el contenido que apruebes, como reel, historia o
            imagen.
          </li>
          <li>
            <Permiso>read_insights</Permiso> — leer las estadísticas de las publicaciones de esas páginas (alcance e
            impresiones), para ordenar el historial por rendimiento. Es opcional: si no lo concedés, todo lo demás
            sigue funcionando.
          </li>
        </ul>
        <p>
          <strong className="text-white">YouTube</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>youtube.upload</Permiso> — subir al canal los videos que publiques, con el título, la
            descripción, las etiquetas y la visibilidad que elijas.
          </li>
          <li>
            <Permiso>youtube.readonly</Permiso> — saber qué canal elegiste al conectar (su identificador, nombre e
            imagen). No lo usamos para leer otros videos, comentarios ni estadísticas del canal.
          </li>
        </ul>
        <p>
          El servicio usa los YouTube API Services. Al publicar en YouTube a través del servicio, aceptás los{" "}
          <Enlace href="https://www.youtube.com/t/terms">Términos del servicio de YouTube</Enlace>.
        </p>
        <p>
          <strong className="text-white">TikTok</strong>
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <Permiso>user.info.basic</Permiso> — saber qué cuenta conectaste (identificador, nombre visible e imagen
            de perfil), para mostrarla como destino.
          </li>
          <li>
            <Permiso>video.publish</Permiso> — publicar en la cuenta los videos que indiques, con el texto, la
            privacidad, las interacciones y la declaración de contenido comercial que elijas en cada publicación.
          </li>
        </ul>
        <p>
          En todas las redes, solo publicamos en las cuentas y páginas que el propietario de la marca habilitó de
          forma explícita, y solo cuando alguien del equipo lo indica. El servicio nunca publica por su cuenta: cada
          publicación la confirma una persona. Si esa persona elige una fecha y hora, la publicación queda
          programada y sale a esa hora; hasta entonces se puede cancelar o cambiar.
        </p>
      </Seccion>

      <Seccion titulo="7. Cuánto tiempo conservamos los datos">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Los datos de cuenta, mientras la cuenta exista.</li>
          <li>
            El contenido, mientras tu suscripción esté activa. Los archivos originales de los episodios pueden
            eliminarse pasados 30 días desde su subida, una vez sacados los clips; las transcripciones, los clips y
            los videos terminados se conservan.
          </li>
          <li>
            Si cancelás o tu plan vence, conservamos el contenido 90 días por si volvés. Pasado ese plazo podemos
            eliminarlo, con aviso previo por correo.
          </li>
          <li>Los registros de pago, el tiempo que exija la ley contable y tributaria.</li>
          <li>Los tokens de las redes, hasta que expiran, se revocan o se desconecta la cuenta.</li>
        </ul>
      </Seccion>

      <Seccion titulo="8. Seguridad">
        <p>
          El acceso exige autenticación y está limitado por roles y por marca. Los tokens de las redes se guardan
          cifrados con AES-256-GCM y no se exponen en ninguna interfaz ni respuesta de la API. Toda la comunicación
          viaja por HTTPS. Ninguna medida ofrece seguridad absoluta, pero estas son las que aplicamos.
        </p>
      </Seccion>

      <Seccion titulo="9. Cómo revocar el acceso a las redes">
        <p>
          Desde el servicio, en <em>Redes conectadas</em>, la opción «Desconectar» de cada página, canal o cuenta
          borra sus tokens y la deja de usar como destino; en YouTube y TikTok, además, le pide a la red que revoque
          el acceso. También podés revocarlo directamente en cada red, y conviene hacer las dos cosas:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Facebook:</strong>{" "}
            <em>Configuración y privacidad → Configuración → Apps y sitios web</em>, eliminando la app.
          </li>
          <li>
            <strong className="text-white">YouTube:</strong> en la{" "}
            <Enlace href="https://myaccount.google.com/permissions">
              página de permisos de tu cuenta de Google
            </Enlace>
            , quitando el acceso de NG Creator.
          </li>
          <li>
            <strong className="text-white">TikTok:</strong> en la app,{" "}
            <em>Perfil → Configuración y privacidad → Seguridad y permisos → Apps y servicios</em>, quitando NG
            Creator.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="10. Tus derechos y cómo eliminar tu cuenta">
        <p>
          Podés pedir acceso a tus datos, corregirlos, llevártelos (los clips terminados se descargan como MP4 en
          cualquier momento) o eliminarlos.
        </p>
        <p>
          Tu cuenta la podés eliminar vos mismo, desde la app o desde la web, en <em>Perfil → Eliminar mi cuenta</em>.
          Antes de confirmar te mostramos qué marcas se ven afectadas. Al eliminarla:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>eliminamos tu usuario del servicio y de AWS Cognito, junto con tu acceso a todas las marcas;</li>
          <li>
            las marcas de las que sos el único miembro se archivan: se desconectan sus redes (borrando sus tokens) y
            se cancelan sus publicaciones programadas. Su contenido queda guardado y se puede recuperar pidiéndolo a{" "}
            <Correo /> por 30 días;
          </li>
          <li>en el historial de las marcas en las que trabajaste, tu nombre pasa a «Cuenta eliminada»;</li>
          <li>
            si sos el único propietario de una marca en la que hay más personas, primero tenés que hacer propietaria
            a otra persona en <em>Equipo</em>: la marca y su contenido siguen siendo de su equipo.
          </li>
        </ul>
        <p>
          También podés pedir la eliminación escribiendo a <Correo /> desde el correo asociado a tu cuenta; la
          hacemos en un plazo de 30 días.
        </p>
        <p>
          Conservamos solo lo que la ley nos obligue a guardar, como los registros de pago. El contenido ya publicado
          en una red social no se elimina desde acá: hay que borrarlo en esa red, porque desde la publicación queda
          bajo su control y el de quien administra la cuenta.
        </p>
      </Seccion>

      <Seccion titulo="11. Menores de edad">
        <p>
          El servicio es para personas mayores de 18 años. No recopilamos a sabiendas datos de menores; si creés que
          un menor nos dio sus datos, escribinos y los eliminamos.
        </p>
      </Seccion>

      <Seccion titulo="12. Cambios en esta política">
        <p>
          Si cambia lo que hacemos con los datos, actualizamos esta página y su fecha. Si el cambio es importante, te
          avisamos por correo antes de que rija.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
