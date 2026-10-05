"use client";

import { useEffect } from "react";
import { ApolloProvider } from "@apollo/client";
import { useLocale } from "next-intl";
import { apolloClient } from "@/lib/apollo";
import { inicializarAutoRefresh } from "@/lib/auth";
import { SesionProvider } from "@/lib/sesion";
import { MarcaActivaProvider } from "@/lib/marca-activa";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    inicializarAutoRefresh();
  }, []);

  // El `lang` del <html> es de donde leen el idioma Apollo y los fetch de lib/
  // (i18n/cliente.ts). Al cambiar el idioma (router.refresh) se asegura acá que
  // quede al día antes del siguiente pedido.
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Los dos providers consultan por GraphQL, asi que van dentro de ApolloProvider.
  return (
    <ApolloProvider client={apolloClient}>
      <SesionProvider>
        <MarcaActivaProvider>{children}</MarcaActivaProvider>
      </SesionProvider>
    </ApolloProvider>
  );
}
