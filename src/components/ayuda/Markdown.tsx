import { marked } from "marked";

/**
 * El cuerpo de un artículo de la wiki. El Markdown sale del repo (no lo
 * escribe ningún usuario), por eso se pinta como HTML sin sanitizar.
 */
export function Markdown({ texto }: { texto: string }) {
  const html = marked.parse(texto, { async: false, gfm: true }) as string;
  return (
    <div
      className="max-w-[68ch] text-[17px] leading-[1.7] text-[#2A2926] [&_a]:font-semibold [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[1.5px] [&_a]:underline-offset-4 hover:[&_a]:decoration-[3px] [&_blockquote]:my-6 [&_blockquote]:rounded-lg [&_blockquote]:border-l-4 [&_blockquote]:border-[#FFD400] [&_blockquote]:bg-[#FFF8CC] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote_p]:my-0 [&_code]:rounded [&_code]:bg-[#F4F3EE] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[15px] [&_img]:my-2 [&_img]:w-full [&_img]:max-w-[420px] [&_img]:rounded-xl [&_img]:border [&_img]:border-[#E9E8E4] [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:leading-tight [&_h2]:text-[#0A0A0A] [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#0A0A0A] [&_li]:my-1.5 [&_li]:pl-1 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_strong]:font-bold [&_strong]:text-[#0A0A0A] [&_table]:my-6 [&_table]:w-full [&_table]:text-left [&_table]:text-[15px] [&_td]:border-b [&_td]:border-[#E9E8E4] [&_td]:py-2 [&_td]:pr-4 [&_th]:border-b-2 [&_th]:border-[#0A0A0A] [&_th]:py-2 [&_th]:pr-4 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&>*:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** El texto plano de un artículo, para buscar y para el índice del MCP. */
export const textoPlano = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
