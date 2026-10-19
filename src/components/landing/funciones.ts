/**
 * Las secciones de /features y sus funciones. Cada sección tiene su página,
 * /features/<id>, y el índice las lista a todas.
 */
import {
  AudioLines,
  Bot,
  BellRing,
  Bell,
  Blend,
  Building2,
  CalendarDays,
  Captions,
  ChartColumn,
  ClipboardCheck,
  CloudCheck,
  ChartLine,
  Columns2,
  Crop,
  Download,
  Drum,
  Eraser,
  FastForward,
  FileDown,
  Film,
  Gauge,
  Hand,
  Hash,
  Image as IconoImagen,
  ImagePlus,
  Images,
  Languages,
  ListChecks,
  Mail,
  Megaphone,
  Mic,
  MessageSquareText,
  Move,
  Music,
  Palette,
  PanelsTopLeft,
  Pencil,
  Pipette,
  Radio,
  Ratio,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Scissors,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SpellCheck,
  Stamp,
  Sticker,
  TextCursorInput,
  Timer,
  TrendingUp,
  Type,
  Upload,
  UploadCloud,
  UserCheck,
  Volume2,
  VolumeX,
  WandSparkles,
  Zap,
  Activity,
  AtSign,
  Handshake,
  Layers,
  Search,
  AlarmClock,
  BadgeCheck,
  Eye,
  Undo2,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";

/**
 * Todas las funciones de Clipfine, por sección. Solo lo que ya funciona en la
 * web o en la app (verificado contra el código el 6/10; editor, audio y revisión el 10/10): si algo se apaga o
 * cambia, se saca de acá. Cada item es una clave de `landingFunciones.items`; el id es la URL
 * (/features/<id>).
 */
export const SECCIONES = [
  {
    id: "ia",
    items: [
      { clave: "momentos", icono: Sparkles },
      { clave: "puntaje", icono: Gauge },
      { clave: "sugeridos", icono: Zap },
      { clave: "aMano", icono: MessageSquareText },
      { clave: "pedirMomentos", icono: ListChecks },
      { clave: "desdeChatgpt", icono: Bot },
    ],
  },
  {
    id: "edicion",
    items: [
      { clave: "editor", icono: PanelsTopLeft },
      { clave: "guardado", icono: CloudCheck },
      { clave: "tramo", icono: Crop },
      { clave: "cortes", icono: Scissors },
      { clave: "silencios", icono: VolumeX },
      { clave: "autoEncuadre", icono: ScanFace },
      { clave: "encuadreManual", icono: Move },
      { clave: "formatos", icono: Ratio },
      { clave: "disenos", icono: Columns2 },
      { clave: "fondo", icono: Blend },
      { clave: "velocidad", icono: FastForward },
    ],
  },
  {
    id: "audio",
    items: [
      { clave: "volumenVoz", icono: Volume2 },
      { clave: "musica", icono: Music },
      { clave: "bajarAlHablar", icono: AudioLines },
      { clave: "efectos", icono: Drum },
    ],
  },
  {
    id: "textos",
    items: [
      { clave: "subtitulos", icono: Captions },
      { clave: "corregir", icono: SpellCheck },
      { clave: "estilos", icono: Palette },
      { clave: "textosDiseno", icono: Type },
      { clave: "gancho", icono: Zap },
      { clave: "cta", icono: Megaphone },
    ],
  },
  {
    id: "imagenes",
    items: [
      { clave: "hastaTres", icono: ImagePlus },
      { clave: "quitarFondo", icono: Eraser },
      { clave: "contorno", icono: Sticker },
    ],
  },
  {
    id: "marca",
    items: [
      { clave: "logo", icono: Stamp },
      { clave: "colores", icono: Pipette },
      { clave: "estiloMarca", icono: Type },
      { clave: "aplicaSolo", icono: WandSparkles },
    ],
  },
  {
    id: "calidad",
    items: [
      { clave: "render", icono: Film },
      { clave: "indicador", icono: Gauge },
      { clave: "vistaPrevia", icono: Smartphone },
      { clave: "versionFacebook", icono: Timer },
      { clave: "descargar", icono: Download },
    ],
  },
  {
    id: "importar",
    items: [
      { clave: "subir", icono: Upload },
      { clave: "restream", icono: Radio },
      { clave: "clipsEditados", icono: UploadCloud },
    ],
  },
  {
    id: "subir-clips",
    items: [
      { clave: "soltarVarios", icono: UploadCloud },
      { clave: "talCual", icono: BadgeCheck },
      { clave: "retocar", icono: PanelsTopLeft },
      { clave: "programarSubido", icono: CalendarDays },
      { clave: "revisarSubido", icono: ClipboardCheck },
      { clave: "medirSubido", icono: ChartColumn },
      { clave: "sinHoras", icono: Timer },
      { clave: "desdeCelular", icono: Smartphone },
    ],
  },
  {
    id: "publicar",
    items: [
      { clave: "cuatroRedes", icono: Send },
      { clave: "sinExportar", icono: Film },
      { clave: "porDefecto", icono: Hash },
      { clave: "portada", icono: IconoImagen },
      { clave: "comoSale", icono: TextCursorInput },
      { clave: "calendario", icono: CalendarDays },
      { clave: "editarAgendada", icono: Pencil },
      { clave: "reintentar", icono: RotateCcw },
    ],
  },
  {
    id: "etiquetas",
    items: [
      { clave: "menciones", icono: AtSign },
      { clave: "tresNiveles", icono: Layers },
      { clave: "verificar", icono: BadgeCheck },
      { clave: "sugeridas", icono: Sparkles },
      { clave: "colaboradores", icono: Handshake },
      { clave: "buscar", icono: Search },
    ],
  },
  {
    id: "revision",
    items: [
      { clave: "porRevisar", icono: ClipboardCheck },
      { clave: "aprobar", icono: BadgeCheck },
      { clave: "pedirCambios", icono: MessageSquareText },
      { clave: "notaVoz", icono: Mic },
      { clave: "clienteRevisor", icono: Eye },
      { clave: "vencimiento", icono: AlarmClock },
      { clave: "editarVuelve", icono: Undo2 },
      { clave: "avisosRevision", icono: BellRing },
    ],
  },
  {
    id: "metricas",
    items: [
      { clave: "metricasClip", icono: ChartColumn },
      { clave: "crecimiento", icono: ChartLine },
      { clave: "retencion", icono: Activity },
      { clave: "iaVsRealidad", icono: BrainCircuit },
      { clave: "resumenPrograma", icono: TrendingUp },
      { clave: "exportar", icono: FileDown },
      { clave: "seActualiza", icono: RefreshCw },
    ],
  },
  {
    id: "equipo",
    items: [
      { clave: "marcas", icono: Building2 },
      { clave: "roles", icono: ShieldCheck },
      { clave: "invitaciones", icono: Mail },
      { clave: "tomar", icono: Hand },
      { clave: "listos", icono: ListChecks },
      { clave: "autoria", icono: UserCheck },
      { clave: "avisos", icono: Bell },
      { clave: "idiomas", icono: Languages },
    ],
  },
  {
    id: "app",
    items: [
      { clave: "app", icono: Smartphone },
      { clave: "sincronizado", icono: RefreshCw },
      { clave: "editarCelular", icono: Scissors },
      { clave: "aprobarCelular", icono: ClipboardCheck },
      { clave: "push", icono: BellRing },
      { clave: "fotos", icono: Images },
    ],
  },
] as const satisfies readonly { id: string; items: readonly { clave: string; icono: LucideIcon }[] }[];

export type IdSeccion = (typeof SECCIONES)[number]["id"];

export const esSeccion = (id: string): id is IdSeccion => SECCIONES.some((s) => s.id === id);

/** Dos dígitos, como los pasos de la landing: 01, 02… */
export const numero = (i: number) => String(i + 1).padStart(2, "0");

/**
 * El namespace con lo que cada sección le dice a una agencia (titular,
 * datos, "Tu agencia" de cada tarjeta, vistas previas, preguntas y SEO):
 * src/messages/{es,en}/features<Seccion>.json.
 */
export const namespaceDe = (id: IdSeccion) =>
  `features${id.replace(/(^|-)(\w)/g, (_, _guion: string, letra: string) => letra.toUpperCase())}`;

/** Las secciones que se recomiendan al final de cada una. */
export const RELACIONADAS: Record<IdSeccion, readonly IdSeccion[]> = {
  ia: ["edicion", "textos"],
  edicion: ["audio", "ia"],
  audio: ["edicion", "textos"],
  textos: ["marca", "imagenes"],
  imagenes: ["textos", "marca"],
  marca: ["textos", "equipo"],
  calidad: ["edicion", "publicar"],
  importar: ["subir-clips", "ia"],
  "subir-clips": ["publicar", "revision"],
  publicar: ["etiquetas", "revision"],
  etiquetas: ["publicar", "metricas"],
  revision: ["publicar", "equipo"],
  metricas: ["publicar", "revision"],
  equipo: ["revision", "marca"],
  app: ["revision", "publicar"],
};

/**
 * El índice de /features agrupado por lo que busca un dueño de agencia, en
 * vez de por pantallas. Cada sección está en un solo grupo.
 */
export const GRUPOS = [
  { id: "producir", secciones: ["importar", "subir-clips", "ia", "edicion", "audio", "textos", "imagenes", "calidad"] },
  { id: "entregar", secciones: ["publicar", "etiquetas", "revision"] },
  { id: "demostrar", secciones: ["metricas"] },
  { id: "operar", secciones: ["marca", "equipo", "app"] },
] as const satisfies readonly { id: string; secciones: readonly IdSeccion[] }[];

/** La función cuya vista previa adelanta cada sección en el índice de /features. */
export const DESTACADA: Record<IdSeccion, string> = {
  importar: "restream",
  "subir-clips": "soltarVarios",
  ia: "puntaje",
  edicion: "editor",
  audio: "efectos",
  textos: "estilos",
  imagenes: "quitarFondo",
  calidad: "vistaPrevia",
  publicar: "cuatroRedes",
  etiquetas: "menciones",
  revision: "aprobar",
  metricas: "crecimiento",
  marca: "colores",
  equipo: "roles",
  app: "app",
};
