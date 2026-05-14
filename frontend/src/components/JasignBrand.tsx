import { useId } from "react";

export function JasignLogo({ size = 34 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `jasignGrad_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      className="jasign-mark"
    >
      <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />
      <path
        d="M8 22V10h2.2l4.4 7.1h.05L19 10h2.2v12h-2V13.2h-.05L15 19.5h-1.9L10.05 13.2H10V22H8Z"
        fill="white"
        opacity={0.95}
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="6"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function JasignWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="wordmark" aria-label="Jasign">
      <JasignLogo />
      <div className="wordmark-text">
        <span className="wordmark-name">Jasign</span>
        {!compact ? <span className="wordmark-tag">PDF E-signatures</span> : null}
      </div>
      <style>{`
        .wordmark {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .wordmark-text {
          display: grid;
          line-height: 1.1;
        }
        .wordmark-name {
          font-weight: 800;
          letter-spacing: -0.04em;
          font-size: 21px;
          background: linear-gradient(135deg, #0f766e, #1d4ed8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .wordmark-tag {
          margin-top: 2px;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}
