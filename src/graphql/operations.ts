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
      regeneraciones
      notaVozTexto
      error
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

export const FACEBOOK_SET_PAGINA_ACTIVA = gql`
  mutation FacebookSetPaginaActiva($id: ID!, $activa: Boolean!) {
    facebookSetPaginaActiva(id: $id, activa: $activa) {
      _id
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

export const FACEBOOK_DESCONECTAR = gql`
  mutation FacebookDesconectar {
    facebookDesconectar
  }
`;

// ---- Facebook: publicar ----

export const PUBLICAR_EN_FACEBOOK = gql`
  mutation PublicarEnFacebook(
    $expedienteId: ID!
    $pageId: String!
    $formato: FormatoFacebook!
    $descripcion: String
  ) {
    publicarEnFacebook(
      expedienteId: $expedienteId
      pageId: $pageId
      formato: $formato
      descripcion: $descripcion
    ) {
      _id
      formato
      estado
      postId
      permalink
      error
      publicadaEn
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
    }
  }
`;

// ---- Revival: historial de la fan page ----

/**
 * El historial guardado de una pagina, rankeado. Lee de nuestra base: para
 * refrescar contra Meta hay que llamar a SINCRONIZAR_HISTORIAL.
 */
export const HISTORIAL_DE_PAGINA = gql`
  query HistorialDePagina(
    $pageId: String!
    $orden: OrdenHistorial!
    $limite: Int!
  ) {
    historialDePagina(pageId: $pageId, orden: $orden, limite: $limite) {
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
      alcance
      impresiones
      score
    }
  }
`;

export const RESUMEN_HISTORIAL = gql`
  query ResumenHistorial($pageId: String!) {
    resumenHistorial(pageId: $pageId) {
      total
      conAlcance
      sincronizadoEn
    }
  }
`;

export const SINCRONIZAR_HISTORIAL = gql`
  mutation SincronizarHistorial($pageId: String!, $maximo: Int) {
    sincronizarHistorial(pageId: $pageId, maximo: $maximo) {
      total
      conAlcance
      nuevos
      sincronizadoEn
    }
  }
`;
