const sizes = {
  sm: 20,
  md: 28,
  lg: 36,
} as const;

interface FluxusLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function FluxusLogo({
  size = "md",
  showText = false,
  className,
}: FluxusLogoProps) {
  const px = sizes[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
    >

      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >

        <path
          d="M8 6h16M8 6v20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 16h11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <rect
          x="22"
          y="13"
          width="5"
          height="5"
          rx="1"
          transform="rotate(45 24.5 15.5)"
          fill="var(--brand-primary, #fbbf24)"
        />
      </svg>


      {showText && (
        <span
          className="font-body font-semibold tracking-tight leading-none"
          style={{ fontSize: px * 0.65 }}
        >
          Fluxus
        </span>
      )}
    </span>
  );
}
