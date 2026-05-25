/**
 * Rendu Markdown minimaliste, sécurisé pour les notes cliniques.
 *
 * Couvre : titres `# ## ###`, gras `**`, italique `*` ou `_`, listes `- `, lignes
 * de séparation `---`, sauts de paragraphes, code inline `\``, retours à la ligne.
 *
 * Pas de support links/images : volonté de sécuriser au maximum les notes (XSS).
 * Si besoin de plus tard, passer à `@tiptap/react` (cf. plan Sprint 4 — risque #4).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(line: string): string {
  let s = escapeHtml(line);
  // code inline `xxx`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  // gras **xxx**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italique *xxx* ou _xxx_
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");
  return s;
}

export function renderMarkdown(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  let inParagraph = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeParagraph = () => {
    if (inParagraph) {
      out.push("</p>");
      inParagraph = false;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (line === "") {
      closeList();
      closeParagraph();
      continue;
    }

    // Séparateur ---
    if (/^---+$/.test(line)) {
      closeList();
      closeParagraph();
      out.push("<hr />");
      continue;
    }

    // Titres
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      closeParagraph();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    // Listes
    if (/^\s*[-*]\s+/.test(line)) {
      closeParagraph();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      const text = line.replace(/^\s*[-*]\s+/, "");
      out.push(`<li>${inline(text)}</li>`);
      continue;
    }

    // Paragraphe (concat avec saut de ligne <br/>)
    closeList();
    if (!inParagraph) {
      out.push("<p>");
      inParagraph = true;
      out.push(inline(line));
    } else {
      out.push(`<br />${inline(line)}`);
    }
  }

  closeList();
  closeParagraph();
  return out.join("");
}
