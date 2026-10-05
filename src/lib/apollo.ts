"use client";

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { CABECERA_IDIOMA, idiomaActual } from "@/i18n/cliente";

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql",
});

/**
 * Inyecta el idToken en cada peticion. El token se guarda en
 * localStorage tras el login via backend (ver lib/auth.ts). Tambien el idioma
 * de la interfaz (`x-idioma`), con el que el backend traduce sus errores.
 */
const authLink = setContext((_, { headers }) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("idToken") : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      [CABECERA_IDIOMA]: idiomaActual(),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
