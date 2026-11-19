const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Icon({ name, size = 16 }: { name: "overview" | "incidents" | "stack" | "alerts" | "settings" | "logout" | "arrow" | "external" | "plus" | "back"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      {name === "overview" && (<><rect x="2" y="2" width="5" height="5" rx="1.2" {...P} /><rect x="9" y="2" width="5" height="5" rx="1.2" {...P} /><rect x="2" y="9" width="5" height="5" rx="1.2" {...P} /><rect x="9" y="9" width="5" height="5" rx="1.2" {...P} /></>)}
      {name === "incidents" && (<><path d="M2.5 4h11M2.5 8h11M2.5 12h7" {...P} /></>)}
      {name === "stack" && (<><path d="m8 2 6 3-6 3-6-3 6-3Z" {...P} /><path d="m2 8 6 3 6-3M2 11l6 3 6-3" {...P} /></>)}
      {name === "alerts" && (<><path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" {...P} /></>)}
      {name === "settings" && (<><circle cx="8" cy="8" r="2" {...P} /><path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.06 1.06M4.66 11.34 3.6 12.4M12.4 12.4l-1.06-1.06M4.66 4.66 3.6 3.6" {...P} /></>)}
      {name === "logout" && (<><path d="M6 13.5H3.5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1H6M10.5 11l3-3-3-3M13.5 8H6" {...P} /></>)}
      {name === "arrow" && <path d="M3 8h10M9 4l4 4-4 4" {...P} />}
      {name === "external" && <path d="M6 3H3.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H12a1 1 0 0 0 1-1V10M9 2.5h4.5V7M13.5 2.5 7 9" {...P} />}
      {name === "plus" && <path d="M8 3v10M3 8h10" {...P} />}
      {name === "back" && <path d="M13 8H3M7 4 3 8l4 4" {...P} />}
    </svg>
  );
}
