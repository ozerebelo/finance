// Hand-drawn "3D-ish" illustrations: soft gradients, a highlight and a ground shadow.
// Original artwork for this app, sized for the top-right corner of a card.
import { useId } from "react";

function Shadow({ cx = 50, cy = 90, rx = 32 }: { cx?: number; cy?: number; rx?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={5} fill="#0b1020" opacity=".14" />;
}

export function WalletArt({ size = 96 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id + "w"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3f4d" /><stop offset="1" stopColor="#14161d" /></linearGradient>
        <linearGradient id={id + "n"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7ee0a1" /><stop offset="1" stopColor="#1fa45a" /></linearGradient>
      </defs>
      <Shadow />
      <rect x="26" y="14" width="44" height="30" rx="4" fill={`url(#${id}n)`} transform="rotate(-12 48 29)" />
      <rect x="32" y="18" width="44" height="30" rx="4" fill="#5fcf8b" transform="rotate(-4 54 33)" />
      <rect x="16" y="32" width="66" height="54" rx="12" fill={`url(#${id}w)`} />
      <rect x="18" y="34" width="62" height="10" rx="6" fill="#fff" opacity=".08" />
      <rect x="58" y="50" width="28" height="20" rx="8" fill="#22252f" />
      <circle cx="69" cy="60" r="4" fill="#9aa0b4" />
    </svg>
  );
}

export function CalendarArt({ size = 84 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id + "h"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b8cff" /><stop offset="1" stopColor="#2f5fe0" /></linearGradient>
        <linearGradient id={id + "c"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd56b" /><stop offset="1" stopColor="#e9a417" /></linearGradient>
      </defs>
      <Shadow cy={92} />
      <rect x="18" y="18" width="66" height="68" rx="12" fill="#f4f6fb" />
      <rect x="18" y="18" width="66" height="22" rx="12" fill={`url(#${id}h)`} />
      <rect x="18" y="30" width="66" height="10" fill={`url(#${id}h)`} />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => <rect key={r + "-" + c} x={26 + c * 14} y={46 + r * 9} width="9" height="5" rx="1.5" fill={r === 1 && c === 2 ? "#2f5fe0" : "#cdd5e6"} />))}
      <rect x="32" y="11" width="6" height="14" rx="3" fill="#8a93a8" />
      <rect x="64" y="11" width="6" height="14" rx="3" fill="#8a93a8" />
      <circle cx="22" cy="74" r="13" fill={`url(#${id}c)`} />
      <text x="22" y="78.5" fontSize="11" fontWeight="800" textAnchor="middle" fill="#9a6400" fontFamily="Inter, sans-serif">€</text>
    </svg>
  );
}

export function ScaleArt({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <Shadow cy={92} rx={22} />
      <rect x="47" y="22" width="6" height="62" rx="3" fill="#4a4f60" />
      <rect x="34" y="82" width="32" height="8" rx="4" fill="#2c303c" />
      <rect x="14" y="24" width="72" height="5" rx="2.5" fill="#5a6072" transform="rotate(-6 50 26)" />
      <circle cx="50" cy="22" r="5" fill="#c9a24a" />
      <path d="M18 30 L10 56 M18 30 L28 56" stroke="#9aa0b4" strokeWidth="1.5" />
      <path d="M82 22 L74 46 M82 22 L92 46" stroke="#9aa0b4" strokeWidth="1.5" />
      <path d="M6 56 h26 a13 9 0 0 1 -26 0z" fill="#2f6bff" />
      <path d="M70 46 h26 a13 9 0 0 1 -26 0z" fill="#f0486e" />
    </svg>
  );
}

export function CardArt({ size = 88 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5c8dff" /><stop offset="1" stopColor="#1f45c9" /></linearGradient>
      </defs>
      <Shadow cy={84} rx={34} />
      <g transform="rotate(-18 50 50)">
        <rect x="12" y="30" width="76" height="46" rx="8" fill={`url(#${id})`} />
        <rect x="12" y="30" width="76" height="12" rx="6" fill="#fff" opacity=".12" />
        <rect x="22" y="46" width="14" height="11" rx="2.5" fill="#ffd56b" />
        <rect x="22" y="64" width="36" height="4" rx="2" fill="#fff" opacity=".55" />
      </g>
    </svg>
  );
}

export function HouseArt({ size = 92 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id + "r"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b8cff" /><stop offset="1" stopColor="#2a55d4" /></linearGradient>
        <linearGradient id={id + "g"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8ee06e" /><stop offset="1" stopColor="#4fae3a" /></linearGradient>
      </defs>
      <ellipse cx="50" cy="86" rx="40" ry="9" fill={`url(#${id}g)`} />
      <rect x="24" y="44" width="52" height="38" rx="3" fill="#f6f2ea" />
      <rect x="24" y="44" width="52" height="5" fill="#e3ddd0" />
      <path d="M16 48 L50 18 L84 48 Z" fill={`url(#${id}r)`} />
      <rect x="64" y="22" width="8" height="16" fill="#e3ddd0" />
      <rect x="44" y="58" width="13" height="24" rx="2" fill="#2a55d4" />
      <rect x="30" y="54" width="10" height="10" rx="1.5" fill="#bfe0ff" />
      <rect x="61" y="54" width="10" height="10" rx="1.5" fill="#bfe0ff" />
      <circle cx="54" cy="70" r="1.3" fill="#ffd56b" />
    </svg>
  );
}

export function PiggyArt({ size = 92 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9fb6" /><stop offset="1" stopColor="#ea5f84" /></linearGradient>
        <linearGradient id={id + "c"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#e5a312" /></linearGradient>
      </defs>
      <Shadow cy={88} rx={30} />
      <circle cx="50" cy="14" r="9" fill={`url(#${id}c)`} />
      <ellipse cx="48" cy="56" rx="32" ry="25" fill={`url(#${id})`} />
      <path d="M30 36 L34 24 L42 34 Z" fill="#ea5f84" />
      <ellipse cx="80" cy="56" rx="7" ry="8" fill="#f37d9c" />
      <circle cx="78" cy="54" r="1.4" fill="#a3334f" />
      <circle cx="82" cy="58" r="1.4" fill="#a3334f" />
      <circle cx="64" cy="46" r="2.4" fill="#3b1a24" />
      <rect x="40" y="33" width="16" height="3.5" rx="1.75" fill="#a3334f" />
      <rect x="28" y="74" width="8" height="12" rx="3" fill="#ea5f84" />
      <rect x="58" y="74" width="8" height="12" rx="3" fill="#ea5f84" />
      <ellipse cx="38" cy="46" rx="12" ry="6" fill="#fff" opacity=".22" />
    </svg>
  );
}

export function ChartArt({ size = 84 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <Shadow cy={90} rx={30} />
      <rect x="18" y="56" width="14" height="30" rx="3" fill="#a9c0ff" />
      <rect x="38" y="40" width="14" height="46" rx="3" fill="#5b8cff" />
      <rect x="58" y="26" width="14" height="60" rx="3" fill="#2f5fe0" />
      <path d="M16 46 L42 30 L58 36 L86 14" stroke="#16a35a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="86" cy="14" r="5" fill="#16a35a" />
    </svg>
  );
}
