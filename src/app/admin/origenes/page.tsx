import { redirect } from "next/navigation";

/** Se mudó a /superadmin (solo para quienes administran Clipfine). */
export default function Movida() {
  redirect("/superadmin/origenes");
}
