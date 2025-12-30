import React, { useState } from "react"
import { asciiColors, ascii } from "../theme/asciiTheme"

type Props = {
  label: string
  onClick?: () => void
  variant?: "primary" | "ghost"
  disabled?: boolean
}

export const AsciiButton: React.FC<Props> = ({ label, onClick, variant = "primary", disabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPrimary = variant === "primary"
  
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          border: `1px solid ${isPrimary ? asciiColors.accent : asciiColors.border}`,
          backgroundColor: isPrimary ? asciiColors.accent : asciiColors.background,
          color: isPrimary ? "#ffffff" : asciiColors.foreground,
          padding: "4px 10px",
          fontSize: 12,
          fontFamily: "Consolas",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontWeight: 500,
          borderRadius: 2,
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.2s ease",
          transform: isHovered && !disabled ? "translateY(-1px)" : "translateY(0)",
          boxShadow: isHovered && !disabled 
            ? `0 2px 8px ${isPrimary ? "rgba(30, 64, 175, 0.3)" : "rgba(0, 0, 0, 0.1)"}`
            : "none",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {isHovered && !disabled && (
          <span style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
            animation: "shimmer 0.6s ease-in-out"
          }} />
        )}
        <span style={{
          transition: "transform 0.2s ease",
          transform: isHovered && !disabled ? "scale(1.1)" : "scale(1)"
        }}>
          {ascii.thickV}
        </span>
        <span>{label}</span>
      </button>
      <style>{`
        @keyframes shimmer {
          to { left: 100%; }
        }
      `}</style>
    </>
  )
}

