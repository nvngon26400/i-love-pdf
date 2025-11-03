function getCssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)
  return v?.trim() || fallback
}

// Nền hoạt hình: Spider‑Man bay qua lại trên màn hình bằng SVG + CSS.
// Dùng SVG nhẹ, không chặn tương tác (pointer-events: none).
export default function ThreeBackground() {
  const bg = getCssVar('--bg', '#0f0f14')
  const accent = getCssVar('--accent', '#6d58ff')
  return (
    <div className="three-bg" style={{ background: 'transparent' }}>
      <svg
        className="spidey-scene"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* bầu trời mờ nhẹ để hợp với theme */}
        <defs>
          <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={bg} stopOpacity={0.2} />
            <stop offset="100%" stopColor={bg} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#sky)" />

        {/* dây tơ nhện */}
        <g className="spidey-web" stroke={accent} strokeWidth="0.4" fill="none" opacity="0.6">
          <path d="M0,10 C20,5 40,12 60,6 C80,2 90,8 100,4" />
        </g>

        {/* nhân vật Spider‑Man đơn giản bằng hình khối SVG */}
        <g className="spidey" transform="translate(-20,15)">
          {/* đầu */}
          <circle cx="0" cy="0" r="3.5" fill="#d62828" stroke="#111" strokeWidth="0.4" />
          {/* mắt */}
          <path d="M-1.6,-0.8 C-2.4,-0.2 -2.0,0.8 -1.0,0.4" fill="#fff" stroke="#111" strokeWidth="0.2" />
          <path d="M1.6,-0.8 C2.4,-0.2 2.0,0.8 1.0,0.4" fill="#fff" stroke="#111" strokeWidth="0.2" />
          {/* thân */}
          <rect x="-2.6" y="3.2" width="5.2" height="6.2" rx="1" fill="#1d4ed8" stroke="#111" strokeWidth="0.4" />
          {/* áo đỏ trên */}
          <rect x="-2.6" y="3.2" width="5.2" height="2.8" rx="1" fill="#d62828" stroke="#111" strokeWidth="0.2" />
          {/* tay */}
          <rect x="-4.2" y="3.6" width="1.6" height="4.2" rx="0.6" fill="#d62828" stroke="#111" strokeWidth="0.2" />
          <rect x="2.6" y="3.6" width="1.6" height="4.2" rx="0.6" fill="#d62828" stroke="#111" strokeWidth="0.2" />
          {/* chân */}
          <rect x="-2.2" y="9.6" width="1.8" height="4.2" rx="0.5" fill="#1d4ed8" stroke="#111" strokeWidth="0.2" />
          <rect x="0.4" y="9.6" width="1.8" height="4.2" rx="0.5" fill="#1d4ed8" stroke="#111" strokeWidth="0.2" />
          {/* dây tơ kèm theo */}
          <line x1="0" y1="-3.6" x2="-12" y2="-10" stroke={accent} strokeWidth="0.3" strokeDasharray="1 1" />
        </g>
      </svg>
    </div>
  )
}