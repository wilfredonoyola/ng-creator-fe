"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

/**
 * Autenticacion basica por correo con AWS Cognito.
 * Guarda el idToken en localStorage para que Apollo lo mande en cada peticion.
 */

let poolCache: CognitoUserPool | null = null;

/**
 * Crea el pool de forma perezosa: solo cuando de verdad se usa en el navegador.
 * Asi el build de Next (sin env vars, en el servidor) no revienta al importar.
 */
function getPool(): CognitoUserPool {
  if (!poolCache) {
    poolCache = new CognitoUserPool({
      UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
      ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
    });
  }
  return poolCache;
}

export function iniciarSesion(
  correo: string,
  password: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: correo, Pool: getPool() });
    const details = new AuthenticationDetails({
      Username: correo,
      Password: password,
    });
    user.authenticateUser(details, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        localStorage.setItem("idToken", idToken);
        resolve(idToken);
      },
      onFailure: (err) => reject(err),
    });
  });
}

export function cerrarSesion() {
  const user = getPool().getCurrentUser();
  user?.signOut();
  localStorage.removeItem("idToken");
}

export function haySesion(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem("idToken");
}
