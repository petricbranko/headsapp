/** Pull a short title out of a WhatsApp alert body (for compact lists). */
export function summarizeMessage(body: string): { header: string; title: string } {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const hi = lines.findIndex((l) => /^\*.+\*$/.test(l));
  const header = hi >= 0 ? lines[hi].replace(/^\*|\*$/g, "") : "";
  const title = hi >= 0 ? lines[hi + 1] ?? "" : lines[0] ?? "";
  return { header: header.replace(/^\S+\s/, ""), title: title.replace(/^_|_$/g, "") };
}
