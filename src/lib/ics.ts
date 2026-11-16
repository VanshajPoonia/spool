import type { Deadline } from "./deadlines";

/*
 * A calendar file of the deadlines you follow, made in the browser. All-day events on your
 * calendar days; re-importing updates the same events, since each keeps a stable UID.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Lines longer than 75 octets continue on the next line after a space (RFC 5545).
function fold(line: string) {
  const out: string[] = [];
  for (let rest = line; rest.length; rest = rest.slice(out.length === 1 ? 75 : 74)) out.push((out.length ? " " : "") + rest.slice(0, out.length ? 74 : 75));
  return out.join("\r\n");
}

export function toIcs(list: Deadline[], now = Date.now()) {
  const stamp = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Spool//Deadlines//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Spool deadlines"];
  for (const d of list) {
    const day = new Date(d.date);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.key.replace(/[^\w:.-]/g, "-")}-${ymd(day)}@spool.vanshajpoonia.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(day)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${esc(d.label)}`,
      ...(d.detail ? [`DESCRIPTION:${esc(d.detail)}`] : []),
      ...(d.href && !d.href.startsWith("/") ? [`URL:${d.href}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(list: Deadline[]) {
  const url = URL.createObjectURL(new Blob([toIcs(list)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "spool-deadlines.ics";
  a.click();
  URL.revokeObjectURL(url);
}
