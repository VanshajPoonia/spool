import { ImageResponse } from "next/og";

export const alt = "Spool: the open source manager that knows whose move it is";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = { console: "#08090a", bay: "#0f1011", rule: "#2c2e33", ink: "#f7f8f8", ink2: "#9ca3ae", ink3: "#7d838d", move: "#f2c94c", pencil: "#eb5757" };

function Mark({ kind }: { kind: "you" | "them" | "stalled" }) {
  if (kind === "stalled") return <div style={{ width: 22, height: 22, borderRadius: 5, background: C.pencil }} />;
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        border: `3px solid ${kind === "you" ? C.move : C.ink3}`,
        background: kind === "you" ? `linear-gradient(90deg, ${C.move} 50%, transparent 50%)` : "transparent",
      }}
    />
  );
}

export default function Image() {
  const bays: [string, "you" | "them" | "stalled"][] = [
    ["Your move", "you"],
    ["Their move", "them"],
    ["Stalled", "stalled"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 72, background: C.console, color: C.ink }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", padding: "6px 14px", borderRadius: 10, border: `2px solid ${C.rule}`, background: C.bay, fontSize: 28, color: C.ink2 }}>(o_o)</div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>Spool</div>
        </div>
        <div style={{ display: "flex", marginTop: 64, fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2.5, maxWidth: 1000 }}>
          The open source manager that knows whose move it is.
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 30, lineHeight: 1.35, color: C.ink2, maxWidth: 940 }}>
          Every PR, issue, review request and mention you have open on GitHub, sorted by who owes the next reply.
        </div>
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 36 }}>
            {bays.map(([label, kind]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: C.ink }}>
                <Mark kind={kind} />
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: C.ink3 }}>spool.vanshajpoonia.com</div>
        </div>
      </div>
    ),
    size,
  );
}
