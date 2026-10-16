import { redirect } from "next/navigation";

/** Publicaciones pasó a ser Contenido: el link viejo sigue andando. */
export default function PublicadosPage() {
  redirect("/contenido");
}
