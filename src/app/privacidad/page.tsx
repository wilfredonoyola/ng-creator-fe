import type { Metadata } from "next";
import { LegalLayout, Seccion } from "@/components/LegalLayout";
import { ACTUALIZADO, CONTACTO, RESPONSABLE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos trata NG Creator, para qué, con qué proveedores se comparten, cuánto se conservan y cómo pedir su eliminación.",
  alternates: { canonical: "/privacidad" },
};

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
          token de acceso de página. Los tokens se guardan cifrados. Cuando el servicio sume otras redes, esta
          política se actualizará con lo que se recibe de cada una antes de habilitarlas.
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

      <Seccion titulo="6. Permisos de Facebook y para qué se usan">
        <p>
          Al conectar una cuenta de Facebook solicitamos estos permisos, y los usamos exclusivamente para lo
          indicado:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <code className="text-[13px] text-ng-teal">pages_show_list</code> — listar las páginas que administrás,
            para que puedas elegir cuáles habilitar como destino.
          </li>
          <li>
            <code className="text-[13px] text-ng-teal">pages_read_engagement</code> — leer los datos básicos de esas
            páginas, como nombre, categoría e imagen.
          </li>
          <li>
            <code className="text-[13px] text-ng-teal">pages_manage_posts</code> — publicar el contenido que
            apruebes, como reel, historia o imagen.
          </li>
          <li>
            <code className="text-[13px] text-ng-teal">read_insights</code> — leer las estadísticas de las
            publicaciones de esas páginas (alcance e impresiones), para ordenar el historial por rendimiento. Es
            opcional: si no lo concedés, todo lo demás sigue funcionando.
          </li>
        </ul>
        <p>
          Solo publicamos en las páginas que un administrador habilitó de forma explícita, y solo cuando alguien del
          equipo lo indica. El servicio nunca publica por su cuenta: todo contenido pasa por una persona antes de
          salir. Una publicación aprobada puede programarse para más tarde; en ese caso la agenda queda del lado de
          Facebook, con su función nativa de programación.
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

      <Seccion titulo="9. Cómo revocar el acceso a Facebook">
        <p>Podés cortar el acceso de dos maneras, y conviene usar las dos:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            Desde el servicio, en <em>Integraciones</em>, con la opción «Desconectar»: dejan de haber tokens
            utilizables y se deshabilitan las páginas como destino.
          </li>
          <li>
            Desde Facebook, en <em>Configuración y privacidad → Configuración → Apps y sitios web</em>, eliminando la
            app. Esto invalida los tokens del lado de Meta.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="10. Tus derechos y cómo eliminar tu cuenta">
        <p>
          Podés pedir acceso a tus datos, corregirlos, llevártelos (los clips terminados se descargan como MP4 en
          cualquier momento) o eliminarlos. Para eliminar tu cuenta, escribí a <Correo /> desde el correo asociado a
          ella. En un plazo de 30 días:
        </p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>eliminamos tu usuario del servicio y de AWS Cognito, junto con tus roles;</li>
          <li>eliminamos las conexiones con redes y todos sus tokens;</li>
          <li>
            si sos propietario de una marca, eliminamos su contenido, salvo que antes le pases la marca a otra persona
            del equipo;
          </li>
          <li>cancelamos tu suscripción en Wompi para que no haya más cobros.</li>
        </ul>
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
