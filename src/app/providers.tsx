"use client";

import { useEffect } from "react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";
import { inicializarAutoRefresh } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    inicializarAutoRefresh();
  }, []);

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
