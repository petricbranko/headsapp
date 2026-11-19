import { Fragment } from "react";

/** Render WhatsApp formatting (*bold*, _italic_, links) as React nodes. Never uses innerHTML. */
export function WaText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderLine(line)}
        </Fragment>
      ))}
    </>
  );
}

function renderLine(line: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|https?:\/\/[^\s]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("*")) out.push(<strong key={k++} className="font-semibold">{t.slice(1, -1)}</strong>);
    else if (t.startsWith("_")) out.push(<em key={k++} className="opacity-75">{t.slice(1, -1)}</em>);
    else
      out.push(
        <a key={k++} href={t} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[#027eb5] hover:underline dark:text-[#53bdeb]">
          {t.replace(/^https?:\/\//, "")}
        </a>,
      );
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
