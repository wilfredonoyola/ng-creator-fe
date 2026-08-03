"use client";

/**
 * Autenticacion via backend GraphQL.
 * El backend habla con Cognito; el frontend solo guarda los tokens.
 */

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql";

interface AuthResult {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

/**
 * Inicia sesion llamando al backend.
 * Guarda el idToken en localStorage para requests autenticados.
 */
export async function iniciarSesion(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            idToken
            accessToken
            expiresIn
          }
        }
      `,
      variables: { input: { email, password } },
    }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? "Error de autenticacion");
  }

  const result: AuthResult = json.data.login;
  localStorage.setItem("idToken", result.idToken);
  localStorage.setItem("accessToken", result.accessToken);

  return result.idToken;
}

/**
 * Cierra sesion llamando al backend y limpiando localStorage.
 */
export async function cerrarSesion(): Promise<void> {
  const accessToken = localStorage.getItem("accessToken");

  if (accessToken) {
    try {
      await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
}

export function haySesion(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("idToken");
}
