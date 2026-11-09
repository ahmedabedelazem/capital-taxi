import type { CSSProperties } from "react";

type BrandMarkProps = {
  size?: number;
  className?: string;
  label?: string;
};

export function BrandMark({ size = 44, className = "", label }: BrandMarkProps) {
  const style: CSSProperties = { width: size, height: size };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-[#8cc63f] shadow-[inset_0_0_0_1px_rgba(24,32,21,.10)] ${className}`} style={style} aria-label={label ?? "شعار تاكسي العاصمة"} role="img">
      <svg viewBox="0 0 64 64" width="78%" height="78%" aria-hidden="true" focusable="false">
        <path d="M13 34.5 17.5 22c1-2.8 3.5-4.5 6.4-4.5h16.2c2.9 0 5.4 1.7 6.4 4.5L51 34.5v13c0 2.5-2 4.5-4.5 4.5H17.5c-2.5 0-4.5-2-4.5-4.5v-13Z" fill="#182015"/>
        <path d="m21 23.5-3.2 8.8h28.4L43 23.5c-.5-1.3-1.6-2.1-3-2.1H24c-1.4 0-2.5.8-3 2.1Z" fill="#f5f7f2"/>
        <path d="M17 36h30v9H17z" fill="#fff"/>
        <path d="M22 39.5h20" stroke="#8cc63f" strokeWidth="3.2" strokeLinecap="round"/>
        <circle cx="22" cy="48" r="4.2" fill="#182015" stroke="#f5f7f2" strokeWidth="1.4"/>
        <circle cx="42" cy="48" r="4.2" fill="#182015" stroke="#f5f7f2" strokeWidth="1.4"/>
        <path d="M27 15.5h10M32 10v5.5" stroke="#182015" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </span>
  );
}
