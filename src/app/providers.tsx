"use client";

import { useEffect } from "react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";
import { inicializarAutoRefresh } from "@/lib/auth";
import { SesionProvider } from "@/lib/sesion";
import { PaginaActivaProvider } from "@/lib/pagina-activa";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    inicializarAutoRefresh();
  }, []);

  // Los dos providers consultan por GraphQL, asi que van dentro de ApolloProvider.
  return (
    <ApolloProvider client={apolloClient}>
      <SesionProvider>
        <PaginaActivaProvider>{children}</PaginaActivaProvider>
      </SesionProvider>
    </ApolloProvider>
  );
}
