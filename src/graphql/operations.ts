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
  query ColaDeRevision($pageId: String) {
    colaDeRevision(pageId: $pageId) {
      _id
      numero
      pageId
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
  query ExpedientesFallidos($pageId: String) {
    expedientesFallidos(pageId: $pageId) {
      _id
      pageId
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
      pageId
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
      pageId
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
      pageId
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

/** Solo las habilitadas: alimenta el switch de contexto. */
export const FACEBOOK_PAGINAS_ACTIVAS = gql`
  query FacebookPaginasActivas {
    facebookPaginasActivas {
      _id
      pageId
      nombre
      fotoUrl
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

// ---- Facebook: publicar ----

export const PUBLICAR_EN_FACEBOOK = gql`
  mutation PublicarEnFacebook(
    $expedienteId: ID!
    $pageId: String!
    $formato: FormatoFacebook!
    $descripcion: String
    $programarPara: DateTime
  ) {
    publicarEnFacebook(
      expedienteId: $expedienteId
      pageId: $pageId
      formato: $formato
      descripcion: $descripcion
      programarPara: $programarPara
    ) {
      _id
      formato
      estado
      postId
      permalink
      error
      publicadaEn
      programadaPara
      publicadoPorNombre
      portadaAplicada
      portadaError
    }
  }
`;

export const FACEBOOK_PUBLICACIONES_DE_EXPEDIENTE = gql`
  query FacebookPublicacionesDeExpediente($expedienteId: ID!) {
    facebookPublicacionesDeExpediente(expedienteId: $expedienteId) {
      _id
      pageId
      pageNombre
      formato
      estado
      postId
      permalink
      error
      publicadaEn
      programadaPara
      publicadoPorNombre
      portadaAplicada
      portadaError
    }
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
 * Las páginas del usuario y su rol en cada una.
 *
 * Define qué muestra la interfaz: quién ve el botón de invitar, quién puede
 * habilitar una página, quién solo mira. Esconder controles es comodidad, no
 * seguridad: quien autoriza de verdad es PaginaGuard en el backend.
 */
export const MIS_ACCESOS = gql`
  query MisAccesos {
    misAccesos {
      pageId
      rol
    }
  }
`;

export const MIEMBROS_DE_PAGINA = gql`
  query MiembrosDePagina($pageId: String!) {
    miembrosDePagina(pageId: $pageId) {
      usuarioId
      pageId
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
  query InvitacionesDePagina($pageId: String!) {
    invitacionesDePagina(pageId: $pageId) {
      _id
      email
      rol
      estado
      createdAt
    }
  }
`;

export const INVITAR_MIEMBRO = gql`
  mutation InvitarMiembro($email: String!, $pageId: String!, $rol: RolPagina!) {
    invitarMiembro(email: $email, pageId: $pageId, rol: $rol) {
      _id
      email
      rol
      estado
    }
  }
`;

export const CAMBIAR_ROL_MIEMBRO = gql`
  mutation CambiarRolMiembro(
    $usuarioId: ID!
    $pageId: String!
    $rol: RolPagina!
  ) {
    cambiarRolMiembro(usuarioId: $usuarioId, pageId: $pageId, rol: $rol) {
      _id
      rol
    }
  }
`;

export const REVOCAR_ACCESO = gql`
  mutation RevocarAcceso($usuarioId: ID!, $pageId: String!) {
    revocarAcceso(usuarioId: $usuarioId, pageId: $pageId)
  }
`;

export const CANCELAR_INVITACION = gql`
  mutation CancelarInvitacion($id: ID!, $pageId: String!) {
    cancelarInvitacion(id: $id, pageId: $pageId)
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

/** Cómo va un montaje. Se consulta cada pocos segundos mientras renderiza. */
export const MONTAJE_TRABAJO = gql`
  query MontajeTrabajo($id: ID!, $pageId: String!) {
    montajeTrabajo(id: $id, pageId: $pageId) {
      _id
      estado
      progreso
      duracionSeg
      expedienteId
      error
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

/** Los borradores de la página, del más reciente al más viejo. */
export const MONTAJES_GUARDADOS = gql`
  query MontajesGuardados($pageId: String!, $limite: Int) {
    montajesGuardados(pageId: $pageId, limite: $limite) {
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
  query MontajeGuardado($id: ID!, $pageId: String!) {
    montajeGuardado(id: $id, pageId: $pageId) {
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
  mutation DuplicarMontaje($id: ID!, $pageId: String!, $nombre: String) {
    duplicarMontaje(id: $id, pageId: $pageId, nombre: $nombre) {
      _id
      nombre
    }
  }
`;

export const RENOMBRAR_MONTAJE = gql`
  mutation RenombrarMontaje($id: ID!, $pageId: String!, $nombre: String!) {
    renombrarMontaje(id: $id, pageId: $pageId, nombre: $nombre) {
      _id
      nombre
    }
  }
`;

export const BORRAR_MONTAJE = gql`
  mutation BorrarMontaje($id: ID!, $pageId: String!) {
    borrarMontaje(id: $id, pageId: $pageId)
  }
`;

/**
 * El estilo por defecto de la página: cómo se ven sus videos.
 *
 * Se lee al empezar un montaje para no tomar diez veces las mismas decisiones.
 */
export const ESTILO_MONTAJE = gql`
  query EstiloMontaje($pageId: String!) {
    estiloMontaje(pageId: $pageId) {
      _id
      config
      updatedAt
    }
  }
`;

export const GUARDAR_ESTILO_MONTAJE = gql`
  mutation GuardarEstiloMontaje($pageId: String!, $config: JSON!) {
    guardarEstiloMontaje(pageId: $pageId, config: $config) {
      _id
      updatedAt
    }
  }
`;

export const OLVIDAR_ESTILO_MONTAJE = gql`
  mutation OlvidarEstiloMontaje($pageId: String!) {
    olvidarEstiloMontaje(pageId: $pageId)
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
  mutation CrearSesionGrabacion($pageId: String!) {
    crearSesionGrabacion(pageId: $pageId) {
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
