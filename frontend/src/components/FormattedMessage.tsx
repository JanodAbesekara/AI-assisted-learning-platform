import type { ReactNode } from "react";

/** Renders formal assistant text with basic markdown-style formatting. */
export default function FormattedMessage({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="formatted-message">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");
        const isBulletList = lines.every(
          (l) => /^\s*[-*•]\s+/.test(l) || l.trim() === ""
        );
        const isNumberedList = lines.every(
          (l) => /^\s*\d+[.)]\s+/.test(l) || l.trim() === ""
        );

        if (isBulletList && lines.filter((l) => l.trim()).length > 0) {
          return (
            <ul key={i} className="fmt-list">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{formatInline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
                ))}
            </ul>
          );
        }

        if (isNumberedList && lines.filter((l) => l.trim()).length > 0) {
          return (
            <ol key={i} className="fmt-list fmt-list-numbered">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>
                    {formatInline(l.replace(/^\s*\d+[.)]\s+/, ""))}
                  </li>
                ))}
            </ol>
          );
        }

        return (
          <p key={i} className="fmt-paragraph">
            {formatInline(trimmed.replace(/\n/g, " "))}
          </p>
        );
      })}
    </div>
  );
}

function formatInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="fmt-strong">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
