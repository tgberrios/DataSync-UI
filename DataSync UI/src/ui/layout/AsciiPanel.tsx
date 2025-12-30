import React from "react"
import { asciiColors, ascii } from "../theme/asciiTheme"

type Props = {
  title?: string
  children: React.ReactNode
  animated?: boolean
}

export const AsciiPanel: React.FC<Props> = ({ title, children, animated = true }) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          animation: animated ? "fadeInUp 0.4s ease-out" : "none",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }}
        onMouseEnter={(e) => {
          if (animated) {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (animated) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {title ? (
          <h2
            style={{
              fontSize: 14,
              fontFamily: "Consolas",
              color: asciiColors.foreground,
              paddingLeft: 2,
              margin: 0,
              marginBottom: 2,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              animation: animated ? "slideInLeft 0.3s ease-out" : "none"
            }}
          >
            <span style={{ 
              display: "inline-block",
              animation: animated ? "pulse 2s ease-in-out infinite" : "none"
            }}>
              {ascii.tl}
            </span>
            {ascii.h.repeat(2)}
            {title}
          </h2>
        ) : null}
        <div
          style={{
            border: `1px solid ${asciiColors.border}`,
            padding: 4,
            overflow: "visible",
            overflowY: "auto",
            fontSize: 12,
            fontFamily: "Consolas",
            backgroundColor: asciiColors.background,
            borderRadius: 2,
            transition: "border-color 0.3s ease, background-color 0.3s ease",
            minHeight: 0
          }}
        >
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  )
}

