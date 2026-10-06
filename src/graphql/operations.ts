import { gql } from "@apollo/client";

// ---- Auth ----

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      idToken
      accessToken
      refreshToken
      expiresIn
    }
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      idToken
      accessToken
      expiresIn
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($accessToken: String!) {
    logout(accessToken: $accessToken)
  }
`;

// ---- Cola de revision ----

/** La cola de revision: videos listos para aprobar. */
export const COLA_DE_REVISION = gql`
  query ColaDeRevision($marcaId: String) {
    colaDeRevision(marcaId: $marcaId) {
      _id
      numero
      marcaId
      tipoDeValor
      estado
      videoFinalUrl
      regeneraciones
      notaVozTexto
      createdAt
      updatedAt
      creadoPor {
        nombre
        en
      }
      revisadoPor {
        nombre
        en
      }
      guion {
        apertura
        detalle
        pregunta
        evidencia
        revelacion
        reconocimiento
        cierre
      }
      validacion {
        aprobado
        checksPasados
        fallas
      }
    }
  }
`;

/** Expedientes que fallaron en el pipeline. */
export const EXPEDIENTES_FALLIDOS = gql`
  query ExpedientesFallidos($marcaId: String) {
    expedientesFallidos(marcaId: $marcaId) {
      _id
      marcaId
      tipoDeValor
      estado
      error
      createdAt
    }
  }
`;

export const APROBAR = gql`
  mutation Aprobar($id: ID!) {
    aprobar(id: $id) {
      _id
      numero
      estado
    }
  }
`;

export const RECHAZAR = gql`
  mutation Rechazar($id: ID!) {
    rechazar(id: $id) {
      _id
      estado
    }
  }
`;

export const REGENERAR = gql`
  mutation Regenerar($input: RegenerarInput!) {
    regenerar(input: $input) {
      _id
      estado
      regeneraciones
    }
  }
`;

export const INGESTAR = gql`
  mutation Ingestar($input: IngestarInput!) {
    ingestar(input: $input) {
      _id
      estado
      marcaId
    }
  }
`;

export const CREATORS = gql`
  query Creators {
    creators {
      _id
      nombre
      handle
      esPropio
    }
  }
`;

export const LICENSES = gql`
  query Licenses {
    licenses {
      _id
      scope
      status
      creatorId
    }
  }
`;

// ---- Crear Creator y License ----

export const CREAR_CREATOR = gql`
  mutation CrearCreator($input: CrearCreatorInput!) {
    crearCreator(input: $input) {
      _id
      nombre
      handle
      esPropio
    }
  }
`;

export const CREAR_LICENSE = gql`
  mutation CrearLicense($input: CrearLicenseInput!) {
    crearLicense(input: $input) {
      _id
      scope
      status
      creatorId
    }
  }
`;

export const REVOCAR_LICENSE = gql`
  mutation RevocarLicense($id: ID!) {
    revocarLicense(id: $id) {
      _id
      status
    }
  }
`;

// ---- License Evidence ----

export const EVIDENCIAS_DE_LICENCIA = gql`
  query EvidenciasDeLicencia($licenseId: ID!) {
    evidenciasDeLicencia(licenseId: $licenseId) {
      _id
      licenseId
      tipo
      contenido
      storagePath
      storageUrl
      nota
      createdAt
    }
  }
`;

export const AGREGAR_EVIDENCIA = gql`
  mutation AgregarEvidencia($input: AgregarEvidenciaInput!) {
    agregarEvidencia(input: $input) {
      _id
      licenseId
      tipo
      contenido
      storagePath
      storageUrl
      nota
      createdAt
    }
  }
`;

export const ELIMINAR_EVIDENCIA = gql`
  mutation EliminarEvidencia($id: ID!) {
    eliminarEvidencia(id: $id)
  }
`;

// ---- Expediente individual ----

export const EXPEDIENTE = gql`
  query Expediente($id: ID!) {
    expediente(id: $id) {
      _id
      numero
      marcaId
      tipoDeValor
      estado
      videoFinalUrl
      posterUrl
      regeneraciones
      notaVozTexto
      error
      creadoPor {
        nombre
        en
      }
      revisadoPor {
        nombre
        en
      }
      guion {
        apertura
        detalle
        pregunta
        evidencia
        revelacion
        reconocimiento
        cierre
      }
      validacion {
        aprobado
        checksPasados
        fallas
      }
    }
  }
`;

// ---- Publications ----

export const PUBLICATIONS = gql`
  query Publications {
    publications {
      _id
      expedienteId
      expedienteNum
      marcaId
      publicadoEn
      videoFinalUrl
      posterUrl
    }
  }
`;

// ---- Sesion / usuarios ----

/** El usuario de la sesion, con sus roles. Define que ve la interfaz. */
export const YO = gql`
  query Yo {
    yo {
      _id
      email
      nombre
      roles
      activo
    }
  }
`;

/**
 * Cambia el nombre con el que la ven en avisos, autoría y Equipo (2–60
 * caracteres; los errores llegan traducidos). Devuelve el usuario para que
 * Apollo actualice `yo` en caché.
 */
export const ACTUALIZAR_MI_NOMBRE = gql`
  mutation ActualizarMiNombre($nombre: String!) {
    actualizarMiNombre(nombre: $nombre) {
      _id
      nombre
    }
  }
`;

/**
 * Lo que pasa si la persona elimina su cuenta (be#95): qué marcas se archivan
 * con ella y cuáles la frenan hasta que haga propietaria a otra persona.
 */
export const RESUMEN_ELIMINAR_CUENTA = gql`
  query ResumenEliminarCuenta {
    resumenEliminarCuenta {
      email
      marcasQueSeArchivan {
        marcaId
        nombre
        otrosMiembros
      }
      marcasQueBloquean {
        marcaId
        nombre
        otrosMiembros
      }
    }
  }
`;

/** Elimina la cuenta de la sesión. `confirmacion` tiene que ser "ELIMINAR". */
export const ELIMINAR_MI_CUENTA = gql`
  mutation EliminarMiCuenta($confirmacion: String!) {
    eliminarMiCuenta(confirmacion: $confirmacion)
  }
`;

export const USUARIOS = gql`
  query Usuarios {
    usuarios {
      _id
      email
      nombre
      roles
      activo
      ultimoAccesoEn
    }
  }
`;

// ---- Facebook: integracion ----

export const FACEBOOK_ESTADO = gql`
  query FacebookEstado {
    facebookConfigurado
    facebookConexion {
      _id
      fbUserId
      fbUserName
      expiraEn
      scopes
      activa
    }
  }
`;

export const FACEBOOK_URL_DE_CONEXION = gql`
  query FacebookUrlDeConexion {
    facebookUrlDeConexion
  }
`;

/** Todas las paginas conectadas (admin), habilitadas o no. */
export const FACEBOOK_PAGINAS = gql`
  query FacebookPaginas {
    facebookPaginas {
      _id
      pageId
      marcaId
      nombre
      categoria
      fotoUrl
      logoUrl
      tasks
      activa
      ultimaSincronizacionEn
    }
  }
`;

/**
 * Las marcas activas del usuario: alimenta el selector de arriba.
 *
 * Trae la página de Facebook de cada marca porque las pantallas propias de
 * Facebook (historial, análisis, publicar) trabajan sobre ella, y porque su
 * foto es la que se ve en el selector desde antes de que existieran las marcas.
 */
export const MARCAS_ACTIVAS = gql`
  query MarcasActivas {
    marcasActivas {
      _id
      nombre
      logoUrl
      paginaFacebook {
        _id
        pageId
        nombre
        fotoUrl
        instagramId
        instagramUsuario
        instagramFotoUrl
      }
      prueba {
        topeEpisodios
        episodiosUsados
        desde
      }
    }
  }
`;

/**
 * Crea una marca para quien se registró solo (onboarding). El backend deja
 * una sola de prueba por persona y la crea con su tope de episodios.
 */
export const CREAR_MARCA = gql`
  mutation CrearMarca($nombre: String!) {
    crearMarca(nombre: $nombre) {
      _id
      nombre
    }
  }
`;

export const FACEBOOK_CONECTAR = gql`
  mutation FacebookConectar($code: String!, $state: String!) {
    facebookConectar(code: $code, state: $state) {
      _id
      fbUserId
      fbUserName
      activa
    }
  }
`;

export const FACEBOOK_RESINCRONIZAR = gql`
  mutation FacebookResincronizarPaginas {
    facebookResincronizarPaginas {
      _id
      pageId
      nombre
      tasks
      activa
    }
  }
`;

/** Habilitar una página como destino. Solo su propietario. */
export const FACEBOOK_SET_PAGINA_ACTIVA = gql`
  mutation FacebookSetPaginaActiva($pageId: String!, $activa: Boolean!) {
    facebookSetPaginaActiva(pageId: $pageId, activa: $activa) {
      _id
      pageId
      activa
    }
  }
`;

/**
 * Registra una pagina por su ID de Facebook.
 *
 * Hace falta porque con acceso estandar a pages_show_list el listado de Meta
 * (/me/accounts) viene vacio: la autorizacion es por pagina, asi que la pagina
 * elegida es accesible pero invisible en el listado. El ID se ve en el propio
 * dialogo de Meta, debajo del nombre.
 */
export const FACEBOOK_REGISTRAR_PAGINA_POR_ID = gql`
  mutation FacebookRegistrarPaginaPorId($pageId: String!) {
    facebookRegistrarPaginaPorId(pageId: $pageId) {
      _id
      pageId
      nombre
      categoria
      fotoUrl
      tasks
      activa
    }
  }
`;

/**
 * Desconecta UNA página, no la integración entera.
 *
 * Antes esto apagaba todas las conexiones y todas las páginas del sistema, así
 * que una persona podía dejar sin publicar a todo el resto.
 */
export const FACEBOOK_DESCONECTAR = gql`
  mutation FacebookDesconectar($pageId: String!) {
    facebookDesconectar(pageId: $pageId)
  }
`;

// ---- Publicar: la cola de publicaciones (ng-creator-be#59) ----

/**
 * Lo que se lee de cada publicación. Igual para las de la cola y para las de
 * antes, que el backend traduce: la tarjeta no tiene que saber de dónde vienen.
 */
const CAMPOS_PUBLICACION = gql`
  fragment CamposPublicacion on PublicacionRed {
    _id
    marcaId
    red
    cuentaId
    cuentaNombre
    expedienteId
    formato
    estado
    publicarEn
    intentos
    error
    postId
    permalink
    publicadaEn
    portadaAplicada
    portadaError
    createdAt
    creadoPor {
      nombre
    }
    canceladoPor {
      nombre
    }
  }
`;

/**
 * Si Facebook programa por la cola propia o le deja la hora a Meta. Cambia lo
 * que la pantalla puede prometer: "sale aunque el servidor esté apagado" solo
 * es cierto cuando la hora la tiene Meta.
 */
export const PUBLICACIONES_POR_COLA = gql`
  query PublicacionesPorCola {
    publicacionesPorCola
  }
`;

export const PROGRAMAR_PUBLICACION = gql`
  mutation ProgramarPublicacion($input: ProgramarPublicacionInput!) {
    programarPublicacion(input: $input) {
      ...CamposPublicacion
    }
  }
  ${CAMPOS_PUBLICACION}
`;

export const CANCELAR_PUBLICACION = gql`
  mutation CancelarPublicacion($marcaId: ID!, $id: ID!) {
    cancelarPublicacion(marcaId: $marcaId, id: $id) {
      ...CamposPublicacion
    }
  }
  ${CAMPOS_PUBLICACION}
`;

export const REPROGRAMAR_PUBLICACION = gql`
  mutation ReprogramarPublicacion(
    $marcaId: ID!
    $id: ID!
    $publicarEn: DateTime!
  ) {
    reprogramarPublicacion(marcaId: $marcaId, id: $id, publicarEn: $publicarEn) {
      ...CamposPublicacion
    }
  }
  ${CAMPOS_PUBLICACION}
`;

/** Las de un expediente, de la cola y de antes, las más nuevas primero. */
export const PUBLICACIONES_DE_EXPEDIENTE = gql`
  query PublicacionesDeExpediente($marcaId: ID!, $expedienteId: ID!) {
    publicacionesDeExpediente(marcaId: $marcaId, expedienteId: $expedienteId) {
      ...CamposPublicacion
    }
  }
  ${CAMPOS_PUBLICACION}
`;

/** Las de un clip de episodio (#71), en todas las redes. */
export const PUBLICACIONES_DE_CLIP = gql`
  query PublicacionesDeClip($marcaId: ID!, $clipId: ID!) {
    publicacionesDeClip(marcaId: $marcaId, clipId: $clipId) {
      ...CamposPublicacion
    }
  }
  ${CAMPOS_PUBLICACION}
`;

/**
 * El calendario (#63, #70): lo de la marca en un rango, con el clip de cada
 * una para la tarjeta. `clip` es null en las de expedientes.
 */
export const PUBLICACIONES_DE_MARCA = gql`
  query PublicacionesDeMarca($marcaId: ID!, $desde: DateTime, $hasta: DateTime) {
    publicacionesDeMarca(marcaId: $marcaId, desde: $desde, hasta: $hasta) {
      ...CamposPublicacion
      descripcion
      portadaUrl
      clip {
        _id
        episodioId
        titulo
        urlPoster
        editadoPor {
          nombre
        }
        tomadoPor {
          nombre
        }
      }
    }
  }
  ${CAMPOS_PUBLICACION}
`;

// ---- YouTube (ng-creator-be#61) ----

/** Si el backend tiene las credenciales de Google cargadas. */
export const YOUTUBE_CONFIGURADO = gql`
  query YoutubeConfigurado {
    youtubeConfigurado
  }
`;

/** URL del diálogo de Google para colgarle un canal a la marca. */
export const YOUTUBE_URL_DE_CONEXION = gql`
  query YoutubeUrlDeConexion($marcaId: ID!) {
    youtubeUrlDeConexion(marcaId: $marcaId)
  }
`;

const CAMPOS_CANAL_YOUTUBE = gql`
  fragment CamposCanalYoutube on YoutubeCanal {
    _id
    marcaId
    canalId
    nombre
    miniaturaUrl
    activa
    requiereReconexion
  }
`;

export const YOUTUBE_CANALES = gql`
  query YoutubeCanales($marcaId: ID!) {
    youtubeCanales(marcaId: $marcaId) {
      ...CamposCanalYoutube
    }
  }
  ${CAMPOS_CANAL_YOUTUBE}
`;

export const YOUTUBE_CONECTAR = gql`
  mutation YoutubeConectar($code: String!, $state: String!) {
    youtubeConectar(code: $code, state: $state) {
      ...CamposCanalYoutube
    }
  }
  ${CAMPOS_CANAL_YOUTUBE}
`;

export const YOUTUBE_SET_CANAL_ACTIVO = gql`
  mutation YoutubeSetCanalActivo(
    $marcaId: ID!
    $canalId: String!
    $activa: Boolean!
  ) {
    youtubeSetCanalActivo(marcaId: $marcaId, canalId: $canalId, activa: $activa) {
      ...CamposCanalYoutube
    }
  }
  ${CAMPOS_CANAL_YOUTUBE}
`;

export const YOUTUBE_DESCONECTAR = gql`
  mutation YoutubeDesconectar($marcaId: ID!, $canalId: String!) {
    youtubeDesconectar(marcaId: $marcaId, canalId: $canalId)
  }
`;

// ---- TikTok (ng-creator-be#62) ----

export const TIKTOK_CONFIGURADO = gql`
  query TiktokConfigurado {
    tiktokConfigurado
  }
`;

export const TIKTOK_URL_DE_CONEXION = gql`
  query TiktokUrlDeConexion($marcaId: ID!) {
    tiktokUrlDeConexion(marcaId: $marcaId)
  }
`;

const CAMPOS_CUENTA_TIKTOK = gql`
  fragment CamposCuentaTiktok on TiktokCuenta {
    _id
    marcaId
    openId
    nombre
    usuario
    avatarUrl
    activa
    requiereReconexion
  }
`;

export const TIKTOK_CUENTAS = gql`
  query TiktokCuentas($marcaId: ID!) {
    tiktokCuentas(marcaId: $marcaId) {
      ...CamposCuentaTiktok
    }
  }
  ${CAMPOS_CUENTA_TIKTOK}
`;

/**
 * Lo que la cuenta permite hoy. TikTok exige pedirlo al abrir la pantalla de
 * publicar y armar las opciones con esto.
 */
export const TIKTOK_INFO_CREADOR = gql`
  query TiktokInfoCreador($marcaId: ID!, $openId: String!) {
    tiktokInfoCreador(marcaId: $marcaId, openId: $openId) {
      usuario
      apodo
      avatarUrl
      opcionesDePrivacidad
      comentariosDeshabilitados
      duoDeshabilitado
      stitchDeshabilitado
      duracionMaxSeg
    }
  }
`;

export const TIKTOK_CONECTAR = gql`
  mutation TiktokConectar($code: String!, $state: String!) {
    tiktokConectar(code: $code, state: $state) {
      ...CamposCuentaTiktok
    }
  }
  ${CAMPOS_CUENTA_TIKTOK}
`;

export const TIKTOK_SET_CUENTA_ACTIVA = gql`
  mutation TiktokSetCuentaActiva(
    $marcaId: ID!
    $openId: String!
    $activa: Boolean!
  ) {
    tiktokSetCuentaActiva(marcaId: $marcaId, openId: $openId, activa: $activa) {
      ...CamposCuentaTiktok
    }
  }
  ${CAMPOS_CUENTA_TIKTOK}
`;

export const TIKTOK_DESCONECTAR = gql`
  mutation TiktokDesconectar($marcaId: ID!, $openId: String!) {
    tiktokDesconectar(marcaId: $marcaId, openId: $openId)
  }
`;

// ---- Revival: historial de la fan page ----

/**
 * El historial guardado, rankeado. Lee de nuestra base: para refrescar contra
 * Meta hay que sincronizar, y eso se hace un año por vez.
 */
export const HISTORIAL_DE_PAGINA = gql`
  query HistorialDePagina(
    $pageId: String!
    $orden: OrdenHistorial!
    $limite: Int!
    $anio: Int
    $estado: EstadoRevival
    $sinHistoria: Boolean
  ) {
    historialDePagina(
      pageId: $pageId
      orden: $orden
      limite: $limite
      anio: $anio
      estado: $estado
      sinHistoria: $sinHistoria
    ) {
      _id
      postId
      mensaje
      tipo
      permalink
      imagenUrl
      publicadoEn
      reacciones
      comentarios
      compartidos
      reproducciones
      clics
      score
      estado
      imagenGuardadaUrl
      analisisIa
      promptImagen
      imagenNuevaUrl
      mensajeNuevo
      publicadoPermalink
      programadaPara
      historiaUrl
      historiaPublicadaEn
      imagenSubidaPor {
        nombre
        en
      }
      publicadoPor {
        nombre
        en
      }
      historiaPublicadaPor {
        nombre
        en
      }
    }
  }
`;

export const RESUMEN_HISTORIAL = gql`
  query ResumenHistorial($pageId: String!) {
    resumenHistorial(pageId: $pageId) {
      total
      conMetricas
      sinHistoria
      sincronizadoEn
    }
  }
`;

/** Un renglón por año: qué se trajo, cuándo, y si quedó algo afuera. */
export const ESTADO_POR_ANIO = gql`
  query EstadoPorAnio($pageId: String!) {
    estadoPorAnio(pageId: $pageId) {
      anio
      posts
      sincronizadoEn
      completo
    }
  }
`;

export const SINCRONIZAR_ANIO = gql`
  mutation SincronizarAnio($pageId: String!, $anio: Int!) {
    sincronizarAnio(pageId: $pageId, anio: $anio) {
      anio
      posts
      sincronizadoEn
      completo
    }
  }
`;

/** Cuántos posts hay en cada etapa del flujo. Arma las pestañas. */
export const CONTEO_POR_ESTADO = gql`
  query ConteoPorEstado($pageId: String!) {
    conteoPorEstado(pageId: $pageId) {
      estado
      total
    }
  }
`;

export const CAMBIAR_ESTADO_POST = gql`
  mutation CambiarEstadoPost($postId: String!, $estado: EstadoRevival!) {
    cambiarEstadoPost(postId: $postId, estado: $estado) {
      _id
      postId
      estado
      imagenGuardadaUrl
    }
  }
`;

// ---- Revival: flujo de reciclaje ----

/** Analiza el post y devuelve el prompt para ChatGPT. Una llamada al LLM. */
export const GENERAR_PROMPT_REVIVAL = gql`
  mutation GenerarPromptRevival($postId: String!) {
    generarPromptRevival(postId: $postId) {
      _id
      postId
      analisisIa
      promptImagen
      promptGeneradoEn
    }
  }
`;

export const ADJUNTAR_IMAGEN_NUEVA = gql`
  mutation AdjuntarImagenNueva(
    $postId: String!
    $imagenNuevaUrl: String!
    $mensajeNuevo: String
  ) {
    adjuntarImagenNueva(
      postId: $postId
      imagenNuevaUrl: $imagenNuevaUrl
      mensajeNuevo: $mensajeNuevo
    ) {
      _id
      postId
      estado
      imagenNuevaUrl
      mensajeNuevo
    }
  }
`;

export const PUBLICAR_REVIVAL = gql`
  mutation PublicarRevival($postId: String!, $programarPara: DateTime) {
    publicarRevival(postId: $postId, programarPara: $programarPara) {
      _id
      postId
      estado
      publicadoPostId
      publicadoPermalink
      publicadoEnNuevo
      programadaPara
    }
  }
`;

export const FACEBOOK_SET_LOGO_PAGINA = gql`
  mutation FacebookSetLogoPagina($pageId: String!, $logoUrl: String!) {
    facebookSetLogoPagina(pageId: $pageId, logoUrl: $logoUrl) {
      _id
      pageId
      nombre
      logoUrl
    }
  }
`;

/** Sube la versión nueva a historias. Publicación aparte de la del feed. */
export const PUBLICAR_HISTORIA_REVIVAL = gql`
  mutation PublicarHistoriaRevival($postId: String!) {
    publicarHistoriaRevival(postId: $postId) {
      _id
      postId
      historiaUrl
      historiaPublicadaEn
    }
  }
`;

/** Arma la historia 9:16 con el texto encima, sin publicarla. */
export const PREVISUALIZAR_HISTORIA = gql`
  mutation PrevisualizarHistoria($postId: String!) {
    previsualizarHistoria(postId: $postId) {
      _id
      postId
      historiaUrl
    }
  }
`;

/**
 * Pregunta a Meta si lo agendado ya salió y actualiza el estado.
 *
 * Meta no avisa cuando publica algo programado, así que sin esto un post
 * agendado se queda en "Programado" para siempre.
 */
export const REFRESCAR_PROGRAMADAS = gql`
  mutation RefrescarProgramadas($pageId: String!) {
    refrescarProgramadas(pageId: $pageId)
  }
`;

// ---- Equipo de cada página ----

/**
 * Las marcas del usuario y su rol en cada una.
 *
 * Define qué muestra la interfaz: quién ve el botón de invitar, quién puede
 * habilitar una página, quién solo mira. Esconder controles es comodidad, no
 * seguridad: quien autoriza de verdad es MarcaGuard en el backend.
 */
export const MIS_ACCESOS = gql`
  query MisAccesos {
    misAccesos {
      marcaId
      rol
    }
  }
`;

export const MIEMBROS_DE_PAGINA = gql`
  query MiembrosDePagina($marcaId: String!) {
    miembrosDePagina(marcaId: $marcaId) {
      usuarioId
      marcaId
      rol
      email
      nombre
      activo
      ultimoAccesoEn
      desde
    }
  }
`;

/** Invitaciones que todavía no entraron por primera vez. */
export const INVITACIONES_DE_PAGINA = gql`
  query InvitacionesDePagina($marcaId: String!) {
    invitacionesDePagina(marcaId: $marcaId) {
      _id
      email
      nombre
      rol
      estado
      createdAt
    }
  }
`;

export const INVITAR_MIEMBRO = gql`
  mutation InvitarMiembro(
    $email: String!
    $marcaId: String!
    $rol: RolPagina!
    $nombre: String
  ) {
    invitarMiembro(email: $email, marcaId: $marcaId, rol: $rol, nombre: $nombre) {
      _id
      email
      nombre
      rol
      estado
    }
  }
`;

/**
 * El propietario de la marca (o un admin) le pone o cambia el nombre a alguien
 * del equipo. El nombre es de la persona: cambia en todas sus marcas.
 */
export const ACTUALIZAR_NOMBRE_MIEMBRO = gql`
  mutation ActualizarNombreMiembro($marcaId: String!, $usuarioId: ID!, $nombre: String!) {
    actualizarNombreMiembro(marcaId: $marcaId, usuarioId: $usuarioId, nombre: $nombre) {
      usuarioId
      marcaId
      nombre
    }
  }
`;

export const CAMBIAR_ROL_MIEMBRO = gql`
  mutation CambiarRolMiembro(
    $usuarioId: ID!
    $marcaId: String!
    $rol: RolPagina!
  ) {
    cambiarRolMiembro(usuarioId: $usuarioId, marcaId: $marcaId, rol: $rol) {
      _id
      rol
    }
  }
`;

export const REVOCAR_ACCESO = gql`
  mutation RevocarAcceso($usuarioId: ID!, $marcaId: String!) {
    revocarAcceso(usuarioId: $usuarioId, marcaId: $marcaId)
  }
`;

export const CANCELAR_INVITACION = gql`
  mutation CancelarInvitacion($id: ID!, $marcaId: String!) {
    cancelarInvitacion(id: $id, marcaId: $marcaId)
  }
`;

// ---- Montaje ----

/**
 * Recorta un video ajeno, lo compone en un lienzo nuevo con titulares, y lo
 * deja como expediente en revisión. Pasa por la puerta de derechos: sin
 * licencia vigente no se crea el asset y falla.
 */
/**
 * Arranca el montaje y devuelve el trabajo AL INSTANTE, sin esperar el render.
 *
 * El render tarda minutos y no cabe en una petición: si el navegador cortaba
 * la conexión se perdía la respuesta aunque el servidor terminara bien. El
 * avance se sigue con MONTAJE_TRABAJO.
 */
export const MONTAR_VIDEO = gql`
  mutation MontarVideo($input: MontajeInput!) {
    montarVideo(input: $input) {
      _id
      estado
      progreso
      duracionSeg
    }
  }
`;

/**
 * Lo que está esperando o armándose en la página.
 *
 * Hay una sola vCPU, así que los renders van de uno en uno: esto es la fila.
 * Los terminados no salen acá — ya están en la cola de revisión.
 */
export const MONTAJES_EN_COLA = gql`
  query MontajesEnCola($marcaId: String!) {
    montajesEnCola(marcaId: $marcaId) {
      _id
      estado
      progreso
      duracionSeg
      posicionEnCola
      createdAt
    }
  }
`;

/** Cómo va un montaje. Se consulta cada pocos segundos mientras renderiza. */
export const MONTAJE_TRABAJO = gql`
  query MontajeTrabajo($id: ID!, $marcaId: String!) {
    montajeTrabajo(id: $id, marcaId: $marcaId) {
      _id
      estado
      progreso
      duracionSeg
      expedienteId
      error
      posicionEnCola
    }
  }
`;

/**
 * Guarda el borrador de un montaje. Crea la primera vez y pisa después.
 *
 * Es un upsert: el editor manda `id` vacío la primera vez y el que recibió de
 * ahí en más. No hay crear/actualizar separados a propósito — con guardado
 * automático cada par de segundos, decidir cuál llamar desde acá es una carrera
 * servida: dos guardados casi simultáneos crearían dos borradores del mismo
 * video.
 */
export const GUARDAR_MONTAJE = gql`
  mutation GuardarMontaje($input: GuardarMontajeInput!) {
    guardarMontaje(input: $input) {
      _id
      nombre
      updatedAt
    }
  }
`;

/** Los borradores de la marca, del más reciente al más viejo. */
export const MONTAJES_GUARDADOS = gql`
  query MontajesGuardados($marcaId: String!, $limite: Int) {
    montajesGuardados(marcaId: $marcaId, limite: $limite) {
      _id
      nombre
      origenUrl
      posterUrl
      createdAt
      updatedAt
    }
  }
`;

/** Uno solo, con su configuración entera, para retomarlo. */
export const MONTAJE_GUARDADO = gql`
  query MontajeGuardado($id: ID!, $marcaId: String!) {
    montajeGuardado(id: $id, marcaId: $marcaId) {
      _id
      nombre
      config
      origenUrl
      updatedAt
    }
  }
`;

/**
 * Copia un borrador entero para arrancar de él.
 *
 * La copia la hace el servidor: el cliente no tiene por qué entender la
 * configuración para copiarla, y armándola campo por campo se olvidaría de los
 * que se agreguen mañana.
 */
export const DUPLICAR_MONTAJE = gql`
  mutation DuplicarMontaje($id: ID!, $marcaId: String!, $nombre: String) {
    duplicarMontaje(id: $id, marcaId: $marcaId, nombre: $nombre) {
      _id
      nombre
    }
  }
`;

export const RENOMBRAR_MONTAJE = gql`
  mutation RenombrarMontaje($id: ID!, $marcaId: String!, $nombre: String!) {
    renombrarMontaje(id: $id, marcaId: $marcaId, nombre: $nombre) {
      _id
      nombre
    }
  }
`;

export const BORRAR_MONTAJE = gql`
  mutation BorrarMontaje($id: ID!, $marcaId: String!) {
    borrarMontaje(id: $id, marcaId: $marcaId)
  }
`;

/**
 * El estilo por defecto de la marca: cómo se ven sus videos.
 *
 * Se lee al empezar un montaje para no tomar diez veces las mismas decisiones.
 */
export const ESTILO_MONTAJE = gql`
  query EstiloMontaje($marcaId: String!) {
    estiloMontaje(marcaId: $marcaId) {
      _id
      config
      updatedAt
    }
  }
`;

export const GUARDAR_ESTILO_MONTAJE = gql`
  mutation GuardarEstiloMontaje($marcaId: String!, $config: JSON!) {
    guardarEstiloMontaje(marcaId: $marcaId, config: $config) {
      _id
      updatedAt
    }
  }
`;

export const OLVIDAR_ESTILO_MONTAJE = gql`
  mutation OlvidarEstiloMontaje($marcaId: String!) {
    olvidarEstiloMontaje(marcaId: $marcaId)
  }
`;

/**
 * Elige el cuadro que va a ser la portada del video.
 *
 * Es el mismo poster que se sube como cubierta del Reel y que se publica
 * cuando el formato es imagen, así que se decide antes de publicar.
 */
export const ELEGIR_PORTADA = gql`
  mutation ElegirPortada($id: ID!, $segundo: Float!) {
    elegirPortada(id: $id, segundo: $segundo) {
      _id
      posterUrl
    }
  }
`;

/** Usa como portada una imagen ya subida con POST /uploads/portada. */
export const USAR_PORTADA_SUBIDA = gql`
  mutation UsarPortadaSubida($id: ID!, $storagePath: String!) {
    usarPortadaSubida(id: $id, storagePath: $storagePath) {
      _id
      posterUrl
    }
  }
`;

/**
 * Qué expedientes ya salieron a Facebook y en qué formatos.
 *
 * Una sola consulta para toda la lista: antes cada tarjeta preguntaba por su
 * cuenta, así que el dato llegaba después de dibujar la grilla y no se podía
 * filtrar por algo que todavía no se sabía.
 */
export const FORMATOS_PUBLICADOS = gql`
  query FormatosPublicados {
    formatosPublicados {
      expedienteId
      formatos
    }
  }
`;

// ---- Análisis de rendimiento ----

/**
 * Rendimiento del historial por hora, día y tipo.
 *
 * La zona horaria la manda el navegador: las fechas se guardan en UTC y "las 8
 * de la noche" no es la misma hora en dos países. Una recomendación de horario
 * en la zona equivocada es peor que no darla.
 */
export const ANALISIS_PAGINA = gql`
  query AnalisisPagina(
    $pageId: String!
    $zonaHoraria: String!
    $desdeDias: Int
    $dias: Int!
  ) {
    rendimientoPorHora(
      pageId: $pageId
      zonaHoraria: $zonaHoraria
      desdeDias: $desdeDias
    ) {
      clave
      posts
      scorePromedio
      reaccionesPromedio
      comentariosPromedio
      compartidosPromedio
    }
    rendimientoPorDiaSemana(
      pageId: $pageId
      zonaHoraria: $zonaHoraria
      desdeDias: $desdeDias
    ) {
      clave
      posts
      scorePromedio
      reaccionesPromedio
      comentariosPromedio
      compartidosPromedio
    }
    rendimientoPorTipo(pageId: $pageId, desdeDias: $desdeDias) {
      tipo
      posts
      scorePromedio
    }
    resumenDePeriodo(pageId: $pageId, dias: $dias) {
      dias
      posts
      postsAnterior
      scoreTotal
      scoreTotalAnterior
      scorePromedio
      scorePromedioAnterior
      reacciones
      comentarios
      compartidos
    }
  }
`;

// ---- Puente teléfono → computadora ----

/**
 * Crea el buzón donde el teléfono va a dejar la grabación.
 *
 * No guarda el montaje: solo un id que las dos puntas conocen. El montaje sigue
 * viviendo en la memoria del navegador de la computadora.
 */
export const CREAR_SESION_GRABACION = gql`
  mutation CrearSesionGrabacion($marcaId: String!) {
    crearSesionGrabacion(marcaId: $marcaId) {
      _id
    }
  }
`;

/** La computadora pregunta cada pocos segundos si ya llegó el video. */
export const SESION_GRABACION = gql`
  query SesionGrabacion($id: ID!) {
    sesionGrabacion(id: $id) {
      _id
      storagePath
      publicUrl
      duracionSeg
    }
  }
`;

/** El teléfono deja el video en la sesión, después de subirlo. */
export const ADJUNTAR_GRABACION = gql`
  mutation AdjuntarGrabacion(
    $id: ID!
    $storagePath: String!
    $duracionSeg: Float
  ) {
    adjuntarGrabacion(
      id: $id
      storagePath: $storagePath
      duracionSeg: $duracionSeg
    ) {
      _id
      storagePath
    }
  }
`;

// ---- Episodios largos (subida directa a Bunny Stream) ----

/**
 * Lo que la lista y la subida necesitan de un episodio. Un fragmento para que
 * lo que devuelve cada mutacion actualice la misma fila en la cache de Apollo.
 */
const CAMPOS_EPISODIO = gql`
  fragment CamposEpisodio on Episodio {
    _id
    marcaId
    titulo
    importadoDe
    estadoImportacion
    progresoImportacion
    errorImportacion
    progresoBunny
    nombreArchivo
    tamanoBytes
    estado
    duracionSeg
    miniaturaUrl
    urlReproduccion
    urlOriginal
    error
    estadoTranscripcion
    progresoTranscripcion
    errorTranscripcion
    palabrasTranscritas
    costoTranscripcionUsd
    estadoMomentos
    errorMomentos
    clipsSugeridos
    costoMomentosUsd
    createdAt
    subidoPor {
      nombre
      en
    }
  }
`;

/**
 * Los episodios de la marca. El backend le pregunta a Bunny por los que están
 * pendientes al listarlos, así que refrescar esta query es lo que hace avanzar
 * a "listo".
 */
export const EPISODIOS = gql`
  ${CAMPOS_EPISODIO}
  query Episodios($marcaId: String!, $limite: Int) {
    episodios(marcaId: $marcaId, limite: $limite) {
      ...CamposEpisodio
      # Para el aviso de la calidad de la fuente (AvisoFuente).
      resolucionOriginal {
        ancho
        alto
      }
    }
  }
`;

/**
 * Crea el episodio (o retoma el que quedó a medias con el mismo archivo) y
 * devuelve la firma para subir directo a Bunny. La llave de Bunny no viene:
 * solo el hash que la usa.
 */
export const PREPARAR_SUBIDA_EPISODIO = gql`
  ${CAMPOS_EPISODIO}
  mutation PrepararSubidaEpisodio($input: PrepararSubidaEpisodioInput!) {
    prepararSubidaEpisodio(input: $input) {
      endpoint
      libraryId
      videoId
      expiracion
      firma
      retomada
      episodio {
        ...CamposEpisodio
      }
    }
  }
`;

/** Firma nueva para el mismo video, cuando la anterior está por vencer. */
export const RENOVAR_SUBIDA_EPISODIO = gql`
  mutation RenovarSubidaEpisodio($id: ID!, $marcaId: String!) {
    renovarSubidaEpisodio(id: $id, marcaId: $marcaId) {
      endpoint
      libraryId
      videoId
      expiracion
      firma
    }
  }
`;

export const CONFIRMAR_SUBIDA_EPISODIO = gql`
  ${CAMPOS_EPISODIO}
  mutation ConfirmarSubidaEpisodio($id: ID!, $marcaId: String!) {
    confirmarSubidaEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposEpisodio
    }
  }
`;

/**
 * Pone el episodio a transcribir, o reintenta una transcripción fallida. Los
 * nuevos entran solos a la fila al quedar listos en Bunny (ng-creator-be#67).
 */
export const TRANSCRIBIR_EPISODIO = gql`
  ${CAMPOS_EPISODIO}
  mutation TranscribirEpisodio($id: ID!, $marcaId: String!) {
    transcribirEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposEpisodio
    }
  }
`;

/** Si se puede volver a traer el original de Restream, y cómo va. */
const REIMPORTACION_EPISODIO = gql`
  fragment ReimportacionDelEpisodio on Episodio {
    puedeReimportar
    reimportacion {
      estado
      progreso
      error
      empezoEn
      terminoEn
    }
  }
`;

export const EPISODIO = gql`
  ${CAMPOS_EPISODIO}
  ${REIMPORTACION_EPISODIO}
  query Episodio($id: ID!, $marcaId: String!) {
    episodio(id: $id, marcaId: $marcaId) {
      ...CamposEpisodio
      # Para el aviso de la calidad de la fuente (AvisoFuente).
      resolucionOriginal {
        ancho
        alto
      }
      ...ReimportacionDelEpisodio
    }
  }
`;

/**
 * Volver a traer de Restream el original sin recomprimir de un live ya
 * importado: reemplaza el video del episodio y conserva los clips.
 */
export const VOLVER_A_IMPORTAR_EPISODIO = gql`
  ${REIMPORTACION_EPISODIO}
  mutation VolverAImportarEpisodio($id: ID!, $marcaId: String!) {
    volverAImportarEpisodio(id: $id, marcaId: $marcaId) {
      _id
      ...ReimportacionDelEpisodio
    }
  }
`;

/**
 * El episodio para el editor de un clip: con la resolución del original, que
 * es de donde sale la calidad estimada. Aparte de EPISODIO porque a un
 * episodio viejo el backend se la pide a Bunny la primera vez.
 */
export const EPISODIO_EDITOR = gql`
  ${CAMPOS_EPISODIO}
  query EpisodioEditor($id: ID!, $marcaId: String!) {
    episodio(id: $id, marcaId: $marcaId) {
      ...CamposEpisodio
      resolucionOriginal {
        ancho
        alto
      }
    }
  }
`;

/**
 * Si el clip ya se programó o ya salió (#70): lo que dice la tarjeta del clip
 * ("Programado · vie 3, 18:00"). Las canceladas no cuentan.
 */
const RESUMEN_PUBLICACION_CLIP = gql`
  fragment ResumenPublicacionClip on ResumenPublicacionClip {
    programadas
    publicadas
    fallidas
    proximaEn
    ultimaPublicadaEn
  }
`;

/** Los clips que propuso la IA, de mejor a peor (ng-creator-be#68). */
export const CLIPS_DE_EPISODIO = gql`
  query ClipsDeEpisodio($id: ID!, $marcaId: String!) {
    clipsDeEpisodio(id: $id, marcaId: $marcaId) {
      _id
      estado
      desdeSeg
      hastaSeg
      puntuacion
      motivo
      titulo
      explicacion
      gancho
      texto
      origen
      formato
      estadoRender
      urlVideo
      urlPoster
      tomadoPor {
        usuarioId
        nombre
        en
      }
      listoPor {
        usuarioId
        nombre
        en
      }
      publicacion {
        ...ResumenPublicacionClip
      }
    }
  }
  ${RESUMEN_PUBLICACION_CLIP}
`;

/** Busca momentos otra vez: reintentar un análisis fallido o rehacerlo. */
export const ANALIZAR_MOMENTOS_EPISODIO = gql`
  ${CAMPOS_EPISODIO}
  mutation AnalizarMomentosEpisodio($id: ID!, $marcaId: String!) {
    analizarMomentosEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposEpisodio
    }
  }
`;

export const BORRAR_EPISODIO = gql`
  mutation BorrarEpisodio($id: ID!, $marcaId: String!) {
    borrarEpisodio(id: $id, marcaId: $marcaId)
  }
`;

// ---- Editor de clips (ng-creator-be#69) ----

/**
 * La versión para Facebook de un clip de más de 90 s: un tramo de hasta 90 s
 * dentro del clip (segundos relativos a su inicio), con su propio render.
 */
const CAMPOS_VERSION_CORTA_CLIP = gql`
  fragment CamposVersionCortaClip on VersionCortaClip {
    desdeSeg
    hastaSeg
    estadoRender
    progresoRender
    errorRender
    urlVideo
    calidad {
      nivel
      ampliacion
      fuenteAncho
      fuenteAlto
      bitrateKbps
      medidoEn
    }
  }
`;

const CAMPOS_CLIP_EDITOR = gql`
  fragment CamposClipEditor on ClipEpisodio {
    _id
    episodioId
    marcaId
    origen
    desdeSeg
    hastaSeg
    titulo
    texto
    puntuacion
    motivo
    explicacion
    formato
    encuadre {
      centroX
      centroY
      zoom
    }
    diseno
    fondo
    posiciones {
      desdeSeg
      diseno
      regiones {
        x
        y
        ancho
        alto
      }
    }
    subtitulosActivos
    subtitulo {
      fuente
      tamano
      centroY
      efecto
      mayusculas
    }
    correcciones {
      desde
      texto
    }
    gancho
    ganchoActivo
    ganchoSeg
    plantillaActiva
    estiloTexto
    estiloTextoEfectivo
    textos {
      contenido
      destacadas
      fuente
      tamano
      color
      colorDestacado
      efecto
      colorEfecto
      mayusculas
      centroX
      centroY
      ancho
      desdeSeg
      hastaSeg
    }
    estadoAutoEncuadre
    errorAutoEncuadre
    personasAutoEncuadre
    etapaAutoEncuadre
    progresoAutoEncuadre
    autoEncuadreEmpezoEn
    autoEncuadreDeshacible
    resumenAutoEncuadre {
      cx
      segundos
      retrato
    }
    estadoRender
    progresoRender
    errorRender
    urlVideo
    urlPoster
    renderizadoEn
    editadoEn
    calidad {
      nivel
      ampliacion
      fuenteAncho
      fuenteAlto
      bitrateKbps
      medidoEn
    }
    versionFacebook {
      ...CamposVersionCortaClip
    }
    tomadoPor {
      usuarioId
      nombre
      en
    }
    listoPor {
      usuarioId
      nombre
      en
    }
    publicacion {
      ...ResumenPublicacionClip
    }
    lineasSubtitulo {
      desde
      hasta
      palabras {
        texto
        desde
        hasta
      }
    }
  }
  ${RESUMEN_PUBLICACION_CLIP}
  ${CAMPOS_VERSION_CORTA_CLIP}
`;

/** Los colores de la marca para los clips, su logo y su plantilla (be#117). */
const CAMPOS_ESTILO_CLIP_MARCA = gql`
  fragment CamposEstiloClipMarca on EstiloClipMarca {
    colorSubtitulo
    colorResaltado
    colorGancho
    colorContornoGancho
    logoUrl
    plantilla {
      logoActivo
      logoPosicion
      logoTamano
      logoOpacidad
      ctaActivo
      ctaTexto
      ctaSeg
      estiloTexto
    }
    tema {
      colorPrimario
      colorSecundario
      colorTexto
      colorFondo
    }
    estiloTexto
  }
`;

export const CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  ${CAMPOS_ESTILO_CLIP_MARCA}
  query ClipEpisodio($id: ID!, $marcaId: String!) {
    clipEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposClipEditor
    }
    estiloClipMarca(marcaId: $marcaId) {
      ...CamposEstiloClipMarca
    }
  }
`;

/** La plantilla de clips de la marca y su logo (be#117), para la pantalla donde se arma. */
export const PLANTILLA_CLIP_MARCA = gql`
  ${CAMPOS_ESTILO_CLIP_MARCA}
  query PlantillaClipMarca($marcaId: String!) {
    estiloClipMarca(marcaId: $marcaId) {
      ...CamposEstiloClipMarca
    }
  }
`;

export const GUARDAR_PLANTILLA_CLIP = gql`
  mutation GuardarPlantillaClip($marcaId: ID!, $plantilla: PlantillaClipInput!) {
    guardarPlantillaClip(marcaId: $marcaId, plantilla: $plantilla) {
      _id
    }
  }
`;

// ---- Estilos de texto y tema de la marca (ng-creator-be#132) ----

const CAMPOS_TRAZO = `
  fuente
  mayusculas
  escala
  interletra
  alineacion
  color
  contorno
  colorContorno
  sombraX
  sombraY
  colorSombra
  opacidadSombra
  desenfoqueSombra
`;

/**
 * La galería de estilos de texto, tal cual la usa el render. No es de ninguna
 * marca (los colores salen del tema de cada una): se pide una vez.
 */
export const ESTILOS_TEXTO = gql`
  query EstilosTexto {
    estilosTexto {
      estilo
      nombre
      descripcion
      categoria
      respetaTextos
      gancho {
        ${CAMPOS_TRAZO}
        tratamiento
        interlineado
        colorDestacada
        fuenteDestacada
        escalaDestacada
        colorSegundoTono
        opacidadSegundoTono
        colorCaja
        opacidadCaja
        radioCaja
        rellenoX
        rellenoY
        colorCaja2
        colorTexto2
        giro
        colorAcento
        conMarca
        fuenteMarca
      }
      subtitulos {
        ${CAMPOS_TRAZO}
        efectoActiva
        colorActiva
        escalaActiva
        opacidadInactiva
        colorFondoActiva
        radioFondoActiva
        colorFranja
        opacidadFranja
        animacionMs
      }
    }
  }
`;

/** "Usar colores del logo": la paleta del logo, para proponer un tema. Null si no hay logo o no tiene colores. */
export const COLORES_DEL_LOGO = gql`
  query ColoresDelLogo($marcaId: ID!) {
    coloresDelLogo(marcaId: $marcaId) {
      colorPrimario
      colorSecundario
      colores
    }
  }
`;

/** Los colores de la marca para los estilos de texto. Solo el propietario. */
export const GUARDAR_TEMA_MARCA = gql`
  mutation GuardarTemaMarca($marcaId: ID!, $tema: TemaMarcaInput!) {
    guardarTemaMarca(marcaId: $marcaId, tema: $tema) {
      _id
    }
  }
`;

/** Las palabras de un tramo del episodio, con su tiempo. */
export const TRANSCRIPCION_EPISODIO = gql`
  query TranscripcionEpisodio($id: ID!, $marcaId: String!, $desdeSeg: Float, $hastaSeg: Float) {
    transcripcionEpisodio(id: $id, marcaId: $marcaId, desdeSeg: $desdeSeg, hastaSeg: $hastaSeg) {
      texto
      desde
      hasta
    }
  }
`;

export const CREAR_CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  mutation CrearClipEpisodio($input: CrearClipEpisodioInput!) {
    crearClipEpisodio(input: $input) {
      ...CamposClipEditor
    }
  }
`;

export const ACTUALIZAR_CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  mutation ActualizarClipEpisodio($id: ID!, $marcaId: String!, $input: ActualizarClipEpisodioInput!) {
    actualizarClipEpisodio(id: $id, marcaId: $marcaId, input: $input) {
      ...CamposClipEditor
    }
  }
`;

export const RENDERIZAR_CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  mutation RenderizarClipEpisodio($id: ID!, $marcaId: String!) {
    renderizarClipEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposClipEditor
    }
  }
`;

/** Guarda el tramo de la versión para Facebook (3–90 s) y encola su render. */
export const GUARDAR_VERSION_FACEBOOK = gql`
  ${CAMPOS_VERSION_CORTA_CLIP}
  mutation GuardarVersionFacebook($id: ID!, $marcaId: String!, $desdeSeg: Float!, $hastaSeg: Float!) {
    guardarVersionFacebook(id: $id, marcaId: $marcaId, desdeSeg: $desdeSeg, hastaSeg: $hastaSeg) {
      _id
      versionFacebook {
        ...CamposVersionCortaClip
      }
    }
  }
`;

export const QUITAR_VERSION_FACEBOOK = gql`
  ${CAMPOS_VERSION_CORTA_CLIP}
  mutation QuitarVersionFacebook($id: ID!, $marcaId: String!) {
    quitarVersionFacebook(id: $id, marcaId: $marcaId) {
      _id
      versionFacebook {
        ...CamposVersionCortaClip
      }
    }
  }
`;

export const BORRAR_CLIP_EPISODIO = gql`
  mutation BorrarClipEpisodio($id: ID!, $marcaId: String!) {
    borrarClipEpisodio(id: $id, marcaId: $marcaId)
  }
`;

/** Que el clip siga al que habla (ng-creator-be#105): lo hace el worker y deja los tramos en `posiciones`. */
export const AUTO_ENCUADRAR_CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  mutation AutoEncuadrarClipEpisodio($id: ID!, $marcaId: String!) {
    autoEncuadrarClipEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposClipEditor
    }
  }
`;

/** "Volver a como estaba": el diseño y los encuadres de antes del último auto-encuadre. */
export const DESHACER_AUTO_ENCUADRE_CLIP_EPISODIO = gql`
  ${CAMPOS_CLIP_EDITOR}
  mutation DeshacerAutoEncuadreClipEpisodio($id: ID!, $marcaId: String!) {
    deshacerAutoEncuadreClipEpisodio(id: $id, marcaId: $marcaId) {
      ...CamposClipEditor
    }
  }
`;

/**
 * Quien tiene cada clip (#70, ng-creator-be#125). Devuelven solo `tomadoPor`:
 * con el _id alcanza para que Apollo actualice la lista y el editor.
 */
export const TOMAR_CLIP_EPISODIO = gql`
  mutation TomarClipEpisodio($id: ID!, $marcaId: String!) {
    tomarClipEpisodio(id: $id, marcaId: $marcaId) {
      _id
      tomadoPor {
        usuarioId
        nombre
        en
      }
    }
  }
`;

export const SOLTAR_CLIP_EPISODIO = gql`
  mutation SoltarClipEpisodio($id: ID!, $marcaId: String!) {
    soltarClipEpisodio(id: $id, marcaId: $marcaId) {
      _id
      tomadoPor {
        usuarioId
        nombre
        en
      }
    }
  }
`;

/**
 * "Listo" (#70, ng-creator-be#129): quien lo editó lo da por terminado y
 * cualquiera del equipo lo puede programar. `listo: false` lo vuelve a "en
 * trabajo". Pide el MP4 procesado.
 */
export const MARCAR_CLIP_LISTO = gql`
  mutation MarcarClipListo($id: ID!, $marcaId: String!, $listo: Boolean!) {
    marcarClipListo(id: $id, marcaId: $marcaId, listo: $listo) {
      _id
      listoPor {
        usuarioId
        nombre
        en
      }
    }
  }
`;

/** Los listos de toda la marca que nadie programó todavía: lo que le queda a quien programa. */
export const CLIPS_LISTOS_SIN_PROGRAMAR = gql`
  query ClipsListosSinProgramar($marcaId: String!) {
    clipsListosSinProgramar(marcaId: $marcaId) {
      _id
      episodioId
      titulo
      desdeSeg
      hastaSeg
      urlPoster
      listoPor {
        usuarioId
        nombre
        en
      }
    }
  }
`;

/**
 * Los clips que ya cubren parte de un tramo, para avisar antes de cortar dos
 * veces el mismo momento. No bloquea: el que decide es quien corta.
 */
export const CRUCES_DE_TRAMO = gql`
  query CrucesDeTramo(
    $episodioId: ID!
    $marcaId: String!
    $desdeSeg: Float!
    $hastaSeg: Float!
    $excluirClipId: ID
  ) {
    crucesDeTramo(
      episodioId: $episodioId
      marcaId: $marcaId
      desdeSeg: $desdeSeg
      hastaSeg: $hastaSeg
      excluirClipId: $excluirClipId
    ) {
      clipId
      titulo
      desdeSeg
      hastaSeg
      tomadoPor {
        usuarioId
        nombre
        en
      }
      segundosEnComun
      masLargo
    }
  }
`;

/** Dónde se dice una frase en el episodio: el paso 1 del "Crear clip" guiado. */
export const BUSCAR_EN_EPISODIO = gql`
  query BuscarEnEpisodio($id: ID!, $marcaId: String!, $texto: String!) {
    buscarEnEpisodio(id: $id, marcaId: $marcaId, texto: $texto) {
      desdeSeg
      hastaSeg
      antes
      frase
      despues
    }
  }
`;

// ---- Restream: importar la grabación de un live como episodio ----

export const RESTREAM_CONFIGURADO = gql`
  query RestreamConfigurado {
    restreamConfigurado
  }
`;

export const RESTREAM_CUENTA = gql`
  query RestreamCuenta($marcaId: ID!) {
    restreamCuenta(marcaId: $marcaId) {
      _id
      nombre
      email
      requiereReconexion
    }
  }
`;

export const RESTREAM_URL_DE_CONEXION = gql`
  query RestreamUrlDeConexion($marcaId: ID!) {
    restreamUrlDeConexion(marcaId: $marcaId)
  }
`;

export const RESTREAM_CONECTAR = gql`
  mutation RestreamConectar($code: String!, $state: String!) {
    restreamConectar(code: $code, state: $state) {
      _id
      nombre
    }
  }
`;

export const RESTREAM_DESCONECTAR = gql`
  mutation RestreamDesconectar($marcaId: ID!) {
    restreamDesconectar(marcaId: $marcaId)
  }
`;

export const RESTREAM_EVENTOS = gql`
  query RestreamEventos($marcaId: ID!) {
    restreamEventos(marcaId: $marcaId) {
      id
      titulo
      portadaUrl
      empezoEn
      duracionSeg
      archivo
      grabacionVenceEn
      episodioId
    }
  }
`;

export const IMPORTAR_DE_RESTREAM = gql`
  mutation ImportarDeRestream($marcaId: ID!, $eventoId: String!) {
    importarDeRestream(marcaId: $marcaId, eventoId: $eventoId) {
      _id
    }
  }
`;

// ---- Notificaciones (ng-creator-be#134) ----

/**
 * Los avisos al equipo de la marca: clips listos, tomados, programados y
 * publicados. Del más nuevo al más viejo; la página siguiente se pide con
 * `antesDe` = el `createdAt` del último que llegó.
 */
export const MIS_NOTIFICACIONES = gql`
  query MisNotificaciones($marcaId: String, $limite: Int, $antesDe: DateTime) {
    misNotificaciones(marcaId: $marcaId, limite: $limite, antesDe: $antesDe) {
      _id
      tipo
      titulo
      cuerpo
      leida
      createdAt
      marcaId
      marcaNombre
      actor {
        nombre
      }
      enlace {
        episodioId
        clipId
        publicadas {
          red
          url
        }
      }
    }
  }
`;

export const NOTIFICACIONES_SIN_LEER = gql`
  query NotificacionesSinLeer($marcaId: String) {
    notificacionesSinLeer(marcaId: $marcaId)
  }
`;

/** Sin `ids` marca todas las de la marca. */
export const MARCAR_NOTIFICACIONES_LEIDAS = gql`
  mutation MarcarNotificacionesLeidas($ids: [ID!], $marcaId: String) {
    marcarNotificacionesLeidas(ids: $ids, marcaId: $marcaId)
  }
`;

/** Siempre vienen los cuatro tipos, con lo que ya eligió o con lo de fábrica. */
export const PREFERENCIAS_NOTIFICACION = gql`
  query PreferenciasNotificacion {
    preferenciasNotificacion {
      tipo
      enApp
      push
      correo
    }
  }
`;

export const GUARDAR_PREFERENCIA_NOTIFICACION = gql`
  mutation GuardarPreferenciaNotificacion($input: PreferenciaNotificacionInput!) {
    guardarPreferenciaNotificacion(input: $input) {
      tipo
      enApp
      push
      correo
    }
  }
`;
