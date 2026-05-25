import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders bold", () => {
    expect(renderMarkdown("**important**")).toContain("<strong>important</strong>");
  });

  it("renders italic with stars", () => {
    expect(renderMarkdown("un *mot* italique")).toContain("<em>mot</em>");
  });

  it("renders italic with underscores", () => {
    expect(renderMarkdown("un _mot_ italique")).toContain("<em>mot</em>");
  });

  it("renders headings h1/h2/h3", () => {
    expect(renderMarkdown("# Titre 1")).toContain("<h1>Titre 1</h1>");
    expect(renderMarkdown("## Titre 2")).toContain("<h2>Titre 2</h2>");
    expect(renderMarkdown("### Titre 3")).toContain("<h3>Titre 3</h3>");
  });

  it("renders unordered list", () => {
    const out = renderMarkdown("- premier\n- deuxième");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>premier</li>");
    expect(out).toContain("<li>deuxième</li>");
    expect(out).toContain("</ul>");
  });

  it("renders horizontal rule", () => {
    expect(renderMarkdown("---")).toContain("<hr />");
    expect(renderMarkdown("------")).toContain("<hr />");
  });

  it("renders inline code", () => {
    expect(renderMarkdown("le `code` inline")).toContain("<code>code</code>");
  });

  it("escapes HTML in raw text (XSS guard)", () => {
    const out = renderMarkdown("<script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("escapes HTML inside markdown formatting", () => {
    const out = renderMarkdown("**<img onerror=x>**");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("groups consecutive lines into one paragraph with <br/>", () => {
    const out = renderMarkdown("ligne 1\nligne 2");
    expect(out).toContain("<p>");
    expect(out).toContain("ligne 1");
    expect(out).toContain("<br />");
    expect(out).toContain("ligne 2");
  });

  it("splits paragraphs on blank lines", () => {
    const out = renderMarkdown("para 1\n\npara 2");
    const matches = out.match(/<p>/g);
    expect(matches).toHaveLength(2);
  });

  it("handles mixed content (heading + list + paragraph)", () => {
    const out = renderMarkdown("## Notes\n\n- item 1\n- item 2\n\nUn paragraphe.");
    expect(out).toContain("<h2>Notes</h2>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<p>Un paragraphe.</p>");
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
