import React from "react";

interface MrPayLogoProps {
  className?: string;
  size?: number | string;
}

export default function MrPayLogo({ className = "", size = 120 }: MrPayLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl shadow-lg transition-transform duration-200 hover:scale-[1.02] ${className}`}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        background: "linear-gradient(135deg, #0077b6 0%, #0066a2 100%)",
        boxShadow: "0 8px 24px -6px rgba(0, 119, 182, 0.4)",
      }}
    >
      <svg
        viewBox="0 0 160 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full p-2"
      >
        <g transform="translate(18, 28)">
          {/* Tilted white capsule for 'mr' */}
          <g transform="rotate(-6 38 32)">
            <rect
              x="2"
              y="10"
              width="54"
              height="38"
              rx="8"
              fill="#FFFFFF"
              className="drop-shadow-sm"
            />
            <text
              x="29"
              y="37"
              fill="#0072B2"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="24"
              fontWeight="900"
              letterSpacing="-0.8px"
              textAnchor="middle"
            >
              mr
            </text>
          </g>

          {/* White 'pay' text next to the badge */}
          <g transform="translate(64, 4)">
            <text
              x="0"
              y="40"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize="30"
              fontWeight="800"
              letterSpacing="-0.5px"
            >
              pay
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
