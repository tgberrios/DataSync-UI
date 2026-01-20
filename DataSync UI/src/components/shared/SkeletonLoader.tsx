import React from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';

interface SkeletonBoxProps {
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ 
  width = "100%", 
  height = "20px", 
  style = {} 
}) => (
  <div style={{
    width,
    height,
    backgroundColor: asciiColors.backgroundSoft,
    borderRadius: 2,
    position: "relative",
    overflow: "hidden",
    ...style
  }}>
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

interface SkeletonPanelProps {
  title?: boolean;
  rows?: number;
}

export const SkeletonPanel: React.FC<SkeletonPanelProps> = ({ title = true, rows = 4 }) => (
  <div style={{
    border: `1px solid ${asciiColors.border}`,
    borderRadius: 2,
    padding: 16,
    backgroundColor: asciiColors.background
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

interface SkeletonLoaderProps {
  variant?: 'dashboard' | 'table' | 'panel' | 'list' | 'grid';
  panels?: number;
  rows?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'panel',
  panels = 1,
  rows = 4
}) => {
  return (
    <div style={{ 
      padding: "24px", 
      fontFamily: "Consolas", 
      fontSize: 12,
      maxWidth: "1400px",
      margin: "0 auto"
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
      
      {variant === 'dashboard' && (
        <>
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
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24
          }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonPanel key={i} rows={rows} />
            ))}
          </div>
          <SkeletonPanel title rows={6} />
        </>
      )}
      
      {variant === 'table' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <SkeletonBox width="200px" height="18px" style={{ marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <SkeletonBox width="150px" height="32px" />
              <SkeletonBox width="150px" height="32px" />
              <SkeletonBox width="200px" height="32px" />
            </div>
          </div>
          <div style={{
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            overflow: "hidden"
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 8,
              padding: "12px",
              backgroundColor: asciiColors.backgroundSoft,
              borderBottom: `1px solid ${asciiColors.border}`
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBox key={i} width="100%" height="14px" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 8,
                padding: "12px",
                borderBottom: i < 4 ? `1px solid ${asciiColors.border}` : "none"
              }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <SkeletonBox key={j} width="100%" height="12px" />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      
      {variant === 'panel' && (
        <SkeletonPanel rows={rows} />
      )}
      
      {variant === 'list' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: panels }).map((_, i) => (
            <div key={i} style={{
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              padding: 16,
              backgroundColor: asciiColors.background
            }}>
              <SkeletonBox width="60%" height="16px" style={{ marginBottom: 8 }} />
              <SkeletonBox width="100%" height="12px" style={{ marginBottom: 4 }} />
              <SkeletonBox width="80%" height="12px" />
            </div>
          ))}
        </div>
      )}
      
      {variant === 'grid' && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16
        }}>
          {Array.from({ length: panels }).map((_, i) => (
            <SkeletonPanel key={i} rows={rows} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SkeletonLoader;
