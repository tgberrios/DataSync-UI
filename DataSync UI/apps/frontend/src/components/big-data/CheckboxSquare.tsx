import React from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';

interface CheckboxSquareProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: number;
}

const CheckboxSquare: React.FC<CheckboxSquareProps> = ({ checked, onChange, size = 18 }) => {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `1px solid ${checked ? asciiColors.accent : asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: checked ? asciiColors.accent : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0
      }}
    >
      {checked && (
        <span style={{
          color: '#ffffff',
          fontSize: size * 0.7,
          lineHeight: 1,
          fontFamily: 'Consolas, monospace',
          fontWeight: 'bold'
        }}>
          ✓
        </span>
      )}
    </div>
  );
};

export default CheckboxSquare;
