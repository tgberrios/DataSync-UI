import React from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';

export const SkeletonBox: React.FC<{ 
  width?: string; 
  height?: string; 
  style?: React.CSSProperties;
  className?: string;
}> = ({ 
  width = "100%", 
  height = "20px", 
  style = {},
  className = ""
}) => (
  <div 
    className={className}
    style={{
      width,
      height,
      backgroundColor: asciiColors.backgroundSoft,
      borderRadius: 2,
      position: "relative",
      overflow: "hidden",
      ...style
    }}
  >
    <div style={{
      position: "absolute",
      top: 0,
      left: "-100%",
      width: "100%",
      height: "100%",
      background: `linear-gradient(90deg, transparent, ${asciiColors.border}40, transparent)`,
      animation: "shimmer 1.5s infinite"
    }} />
  </div>
);

export const SkeletonPanel: React.FC<{ 
  title?: string;
  rows?: number;
  style?: React.CSSProperties;
}> = ({ 
  title, 
  rows = 4,
  style = {}
}) => (
  <div style={{
    border: `1px solid ${asciiColors.border}`,
    borderRadius: 2,
    padding: 16,
    backgroundColor: asciiColors.background,
    ...style
  }}>
    {title && (
      <SkeletonBox width="120px" height="14px" style={{ marginBottom: 16 }} />
    )}
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SkeletonBox width="60%" height="12px" />
          <SkeletonBox width="30%" height="16px" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  style?: React.CSSProperties;
}> = ({ 
  rows = 5, 
  columns = 4,
  style = {}
}) => (
  <div style={{
    border: `1px solid ${asciiColors.border}`,
    borderRadius: 2,
    padding: 16,
    backgroundColor: asciiColors.background,
    ...style
  }}>
    <div style={{ display: "flex", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${asciiColors.border}` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBox key={i} width="100%" height="14px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        {Array.from({ length: columns }).map((_, j) => (
          <SkeletonBox key={j} width="100%" height="12px" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonPage: React.FC<{
  showHeader?: boolean;
  showPanels?: number;
  showTable?: boolean;
  style?: React.CSSProperties;
}> = ({
  showHeader = true,
  showPanels = 0,
  showTable = false,
  style = {}
}) => (
  <div style={{ 
    padding: "24px", 
    fontFamily: "Consolas", 
    fontSize: 12,
    maxWidth: "1400px",
    margin: "0 auto",
    ...style
  }}>
    <style>{`
      @keyframes shimmer {
        0% {
          left: -100%;
        }
        100% {
          left: 100%;
        }
      }
    `}</style>
    {showHeader && (
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}>
          <SkeletonBox width="300px" height="18px" />
          <SkeletonBox width="150px" height="12px" />
        </div>
        <SkeletonBox width="100%" height="8px" style={{ borderRadius: 4 }} />
      </div>
    )}
    {showPanels > 0 && (
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(showPanels, 4)}, 1fr)`,
        gap: 16,
        marginBottom: 24
      }}>
        {Array.from({ length: showPanels }).map((_, i) => (
          <SkeletonPanel key={i} title="Panel" />
        ))}
      </div>
    )}
    {showTable && <SkeletonTable />}
  </div>
);
