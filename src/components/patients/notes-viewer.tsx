import { renderMarkdown } from "@/lib/markdown";

export function NotesViewer({ content, className }: { content: string; className?: string }) {
  if (!content?.trim()) return null;
  const html = renderMarkdown(content);
  return (
    <div
      className={
        "prose prose-sm max-w-none text-sm leading-relaxed dark:prose-invert " + (className ?? "")
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
