"use client";

import { useEffect, useState } from "react";

export function MeshGradient() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style>{`
        @keyframes blob-drift-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(30%, -20%, 0) scale(1.1); }
          66% { transform: translate3d(-15%, 15%, 0) scale(0.95); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(-25%, 20%, 0) scale(0.9); }
          66% { transform: translate3d(20%, -10%, 0) scale(1.05); }
        }
        @keyframes blob-drift-3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          33% { transform: translate3d(15%, 25%, 0) scale(1.08); }
          66% { transform: translate3d(-20%, -15%, 0) scale(0.92); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mesh-blob { animation: none !important; }
        }
      `}</style>

      {/* Amber blob — top left */}
      <div
        className="mesh-blob absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full"
        style={{
          background: "#fbbf24",
          opacity: 0.2,
          filter: "blur(80px)",
          animation: reduced ? "none" : "blob-drift-1 25s ease-in-out infinite",
          willChange: "transform",
        }}
      />

      {/* Dark amber blob — center right */}
      <div
        className="mesh-blob absolute top-1/4 -right-1/4 w-[55%] h-[55%] rounded-full"
        style={{
          background: "#d97706",
          opacity: 0.15,
          filter: "blur(80px)",
          animation: reduced ? "none" : "blob-drift-2 22s ease-in-out infinite",
          animationDelay: "-7s",
          willChange: "transform",
        }}
      />

      {/* Deep amber blob — bottom center */}
      <div
        className="mesh-blob absolute -bottom-1/4 left-1/4 w-[50%] h-[50%] rounded-full"
        style={{
          background: "#92400e",
          opacity: 0.1,
          filter: "blur(80px)",
          animation: reduced ? "none" : "blob-drift-3 28s ease-in-out infinite",
          animationDelay: "-14s",
          willChange: "transform",
        }}
      />
    </div>
  );
}
