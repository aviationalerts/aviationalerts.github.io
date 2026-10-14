export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 6v4M16 22v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 16h8" stroke="#e8a33a" strokeWidth="2.5" strokeLinecap="square" />
    </svg>
  )
}
