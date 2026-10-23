export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <g className="logo-badge">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#0B2F6A" />
      </g>
      <g className="logo-arcs" stroke="#00BFFF" strokeWidth="1.7" strokeLinecap="round" fill="none">
        <path d="M19.6 5.6 A4.62 4.62 0 0 1 19.6 11.4" />
        <path d="M22 4.4 A7.27 7.27 0 0 1 22 12.6" opacity="0.55" />
        <path d="M12.4 5.6 A4.62 4.62 0 0 0 12.4 11.4" />
        <path d="M10 4.4 A7.27 7.27 0 0 0 10 12.6" opacity="0.55" />
      </g>
      <g className="logo-plane">
        <path
          fill="#FFFFFF"
          d="M16 4 L17.6 11 L27 20 L27 23 L18.2 19.4 L18.2 24.5 L22 27.4 L22 29 L16 30 L10 29 L10 27.4 L13.8 24.5 L13.8 19.4 L5 23 L5 20 L14.4 11 Z"
        />
      </g>
    </svg>
  )
}
