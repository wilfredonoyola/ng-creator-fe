import { permanentRedirect } from "next/navigation";

/** La app se cuenta en /features/app, junto al resto de las funciones. */
export default function App() {
  permanentRedirect("/features/app");
}
