"use client";

import { apolloClient } from "./apollo";
import { cabeceraIdioma } from "@/i18n/cliente";

/**
 * Autenticacion via backend GraphQL.
 * El backend habla con Cognito; el frontend guarda los tokens y los refresca automaticamente.
 */

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

// Refrescar 5 minutos antes de que expire
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface AuthResult {
  idToken?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  desafio?: string | null;
  sesion?: string | null;
}

/**
 * Un ingreso no siempre termina en sesion.
 *
 * A quien fue invitado, Cognito le manda una contrasena temporal y en el primer
 * ingreso pide que elija la definitiva antes de darle tokens. Ese caso vuelve
 * como `nueva-password` y se cierra con `establecerPassword`.
 */
export type ResultadoLogin =
  | { tipo: "sesion" }
  | { tipo: "nueva-password"; sesion: string };

interface RefreshResult {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

/**
 * Inicia sesion llamando al backend.
 * Guarda todos los tokens y programa el auto-refresh.
 */
export async function iniciarSesion(
  email: string,
  password: string
): Promise<ResultadoLogin> {
  const result = await pedir<AuthResult>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        idToken
        accessToken
        refreshToken
        expiresIn
        desafio
        sesion
      }
    }`,
    { input: { email, password } },
    "login"
  );

  if (result.desafio === "NUEVA_PASSWORD" && result.sesion) {
    return { tipo: "nueva-password", sesion: result.sesion };
  }

  await guardarSesion(result);
  return { tipo: "sesion" };
}

/**
 * Cierra el primer ingreso: fija la contrasena definitiva y deja la sesion
 * abierta, para no obligar a volver a escribir el correo recien elegida.
 */
export async function establecerPassword(
  email: string,
  nuevaPassword: string,
  sesion: string
): Promise<void> {
  const result = await pedir<AuthResult>(
    `mutation EstablecerPassword(
      $email: String!
      $nuevaPassword: String!
      $sesion: String!
    ) {
      establecerPassword(
        email: $email
        nuevaPassword: $nuevaPassword
        sesion: $sesion
      ) {
        idToken
        accessToken
        refreshToken
        expiresIn
      }
    }`,
    { email, nuevaPassword, sesion },
    "establecerPassword"
  );

  await guardarSesion(result);
}

/**
 * "Olvide mi contrasena", paso 1: el backend le pide a Cognito que mande un
 * codigo al correo. Responde igual exista o no la cuenta.
 */
export async function pedirCodigoPassword(email: string): Promise<void> {
  await pedir<boolean>(
    `mutation PedirCodigoPassword($email: String!) { pedirCodigoPassword(email: $email) }`,
    { email },
    "pedirCodigoPassword"
  );
}

/** Paso 2: el codigo y la contrasena nueva. Deja la sesion iniciada. */
export async function confirmarPasswordNueva(
  email: string,
  codigo: string,
  nuevaPassword: string
): Promise<void> {
  const result = await pedir<AuthResult>(
    `mutation ConfirmarPasswordNueva($email: String!, $codigo: String!, $nuevaPassword: String!) {
      confirmarPasswordNueva(email: $email, codigo: $codigo, nuevaPassword: $nuevaPassword) {
        idToken
        accessToken
        refreshToken
        expiresIn
      }
    }`,
    { email, codigo, nuevaPassword },
    "confirmarPasswordNueva"
  );
  await guardarSesion(result);
}

/**
 * Registro abierto, paso 1: crea la cuenta (sin confirmar) y Cognito manda un
 * código de 6 dígitos al correo. No da sesión todavía.
 */
export async function registrarse(email: string, password: string, nombre: string | null = null): Promise<void> {
  await pedir<boolean>(
    `mutation Registrarse($email: String!, $password: String!, $nombre: String) { registrarse(email: $email, password: $password, nombre: $nombre) }`,
    { email, password, nombre },
    "registrarse"
  );
}

/** Paso 2: el código del correo confirma la cuenta. Después se entra con `iniciarSesion`. */
export async function confirmarRegistro(email: string, codigo: string): Promise<void> {
  await pedir<boolean>(
    `mutation ConfirmarRegistro($email: String!, $codigo: String!) { confirmarRegistro(email: $email, codigo: $codigo) }`,
    { email, codigo },
    "confirmarRegistro"
  );
}

/** "Mandar otro código" del registro. */
export async function reenviarCodigoRegistro(email: string): Promise<void> {
  await pedir<boolean>(
    `mutation ReenviarCodigoRegistro($email: String!) { reenviarCodigoRegistro(email: $email) }`,
    { email },
    "reenviarCodigoRegistro"
  );
}

/**
 * Error que viene del backend (Cognito), con un mensaje para mostrar tal cual.
 * Cualquier otro error de este archivo (red, respuesta incompleta) lleva un
 * mensaje solo para logs: la pantalla muestra su propio texto traducido.
 */
export class ErrorDeAutenticacion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeAutenticacion";
  }
}

/** Manda una operacion sin sesion y devuelve su dato, o lanza el error. */
async function pedir<T>(
  query: string,
  variables: Record<string, unknown>,
  campo: string
): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cabeceraIdioma() },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    const mensaje = json.errors[0]?.message;
    throw mensaje ? new ErrorDeAutenticacion(mensaje) : new Error("Error de autenticacion");
  }

  return json.data[campo] as T;
}

/**
 * Guarda los tokens de un ingreso completo, arranca el auto-refresh y vuelve a
 * pedir lo que la web ya había preguntado sin sesión.
 *
 * Los providers de la raíz (usuario, accesos, marcas) consultan apenas carga
 * la página, también en /login y en la landing, y sin token esas respuestas
 * vuelven vacías. Como el login navega sin recargar, sin este reset el panel
 * abría sin marcas hasta refrescar a mano.
 */
async function guardarSesion(result: AuthResult): Promise<void> {
  if (!result.idToken || !result.accessToken || !result.refreshToken) {
    throw new Error("El servidor no devolvio una sesion valida");
  }
  const expiresIn = result.expiresIn ?? 3600;
  guardarTokens(
    result.idToken,
    result.accessToken,
    result.refreshToken,
    expiresIn
  );
  programarRefresh(expiresIn);
  await apolloClient.resetStore().catch(() => {});
}

/**
 * Refresca los tokens usando el refresh token.
 */
export async function refrescarTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cabeceraIdioma() },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              idToken
              accessToken
              expiresIn
            }
          }
        `,
        variables: { refreshToken },
      }),
    });

    const json = await response.json();

    if (json.errors) {
      console.warn("Error refrescando tokens:", json.errors[0]?.message);
      return false;
    }

    const result: RefreshResult = json.data.refreshToken;
    // Mantener el refresh token existente
    guardarTokens(result.idToken, result.accessToken, refreshToken, result.expiresIn);
    programarRefresh(result.expiresIn);

    console.log("Tokens refrescados exitosamente");
    return true;
  } catch (err) {
    console.warn("Error refrescando tokens:", err);
    return false;
  }
}

/**
 * Guarda los tokens en localStorage.
 */
function guardarTokens(idToken: string, accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem("idToken", idToken);
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("tokenExpiresAt", expiresAt.toString());
}

/**
 * Programa el refresh automatico antes de que expire el token.
 */
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

function programarRefresh(expiresIn: number) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  // Refrescar 5 minutos antes de que expire
  const refreshIn = Math.max((expiresIn * 1000) - REFRESH_MARGIN_MS, 60000);

  refreshTimeout = setTimeout(async () => {
    const success = await refrescarTokens();
    if (!success) {
      // Si falla el refresh, limpiar todo y redirigir al login
      cerrarSesion();
      window.location.href = "/login";
    }
  }, refreshIn);
}

/**
 * Verifica si el token esta por expirar y lo refresca si es necesario.
 * Llamar antes de hacer requests importantes.
 */
export async function asegurarTokenValido(): Promise<boolean> {
  const expiresAt = localStorage.getItem("tokenExpiresAt");
  if (!expiresAt) return false;

  const expiresAtMs = parseInt(expiresAt, 10);
  const ahora = Date.now();

  // Si expira en menos de 1 minuto, refrescar ahora
  if (expiresAtMs - ahora < 60000) {
    return await refrescarTokens();
  }

  return true;
}

/**
 * Cierra sesion llamando al backend y limpiando localStorage.
 */
export async function cerrarSesion(): Promise<void> {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  const accessToken = localStorage.getItem("accessToken");

  if (accessToken) {
    try {
      await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...cabeceraIdioma() },
        body: JSON.stringify({
          query: `
            mutation Logout($accessToken: String!) {
              logout(accessToken: $accessToken)
            }
          `,
          variables: { accessToken },
        }),
      });
    } catch {
      // Ignoramos errores de logout, igual limpiamos local
    }
  }

  localStorage.removeItem("idToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("tokenExpiresAt");
  // Que quien entre después en este navegador no vea, ni por un instante, las
  // marcas y datos de la cuenta anterior.
  await apolloClient.clearStore().catch(() => {});
}

export function haySesion(): boolean {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem("idToken");
  const expiresAt = localStorage.getItem("tokenExpiresAt");

  if (!token || !expiresAt) return false;

  // Verificar que no haya expirado
  const expiresAtMs = parseInt(expiresAt, 10);
  return Date.now() < expiresAtMs;
}

/**
 * Inicializa el auto-refresh si hay sesion activa.
 * Llamar al cargar la app.
 */
export function inicializarAutoRefresh() {
  if (typeof window === "undefined") return;

  const expiresAt = localStorage.getItem("tokenExpiresAt");
  if (!expiresAt) return;

  const expiresAtMs = parseInt(expiresAt, 10);
  const ahora = Date.now();
  const tiempoRestante = expiresAtMs - ahora;

  if (tiempoRestante <= 0) {
    // Token expirado, intentar refrescar
    refrescarTokens().then((success) => {
      if (!success) {
        cerrarSesion();
      }
    });
  } else {
    // Programar refresh
    const expiresIn = Math.floor(tiempoRestante / 1000);
    programarRefresh(expiresIn);
  }
}
