import React from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

const LoadingScreen = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: asciiColors.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Consolas, "Source Code Pro", monospace'
    }}>
      <div style={{
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-in'
      }}>
        <div style={{
          fontSize: 48,
          color: asciiColors.accent,
          marginBottom: 20,
          animation: 'spin 1s linear infinite'
        }}>
          {ascii.blockFull}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: asciiColors.foreground,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          {ascii.blockFull} DataSync
        </div>
        <div style={{
          fontSize: 11,
          color: asciiColors.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4
        }}>
          <span>Loading</span>
          <span style={{
            animation: 'dots 1.5s steps(4, end) infinite'
          }}>
            {ascii.dot.repeat(3)}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dots {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
