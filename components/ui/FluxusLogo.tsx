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
  const id = `flux-grad-${size}`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={id}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="52%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Outer arc — top flow */}
        <path
          d="M6 10 C6 10 10 6 16 6 C22 6 26 10 26 16"
          stroke={`url(#${id})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Inner arc — bottom counter-flow */}
        <path
          d="M26 22 C26 22 22 26 16 26 C10 26 6 22 6 16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.45"
          fill="none"
        />

        {/* Amber dot — focal accent */}
        <circle cx="16" cy="16" r="2.5" fill={`url(#${id})`} />

        {/* Arrow tip on outer arc */}
        <path
          d="M23 13 L26 16 L23 19"
          stroke={`url(#${id})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
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
