import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { TargetNodeData } from '../types';

interface TargetNodeProps {
  data: TargetNodeData;
  selected: boolean;
}

export const TargetNode = ({ data, selected }: TargetNodeProps) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        background: selected ? asciiColors.accent + '20' : asciiColors.backgroundSoft,
        border: `2px solid ${selected ? asciiColors.accent : asciiColors.border}`,
        borderRadius: 4,
        minWidth: 200,
        fontFamily: 'Consolas',
        fontSize: 11
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        color: asciiColors.accent,
        fontWeight: 600
      }}>
        <span>{ascii.blockFull}</span>
        <span>TARGET</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        {data.table ? (
          <>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              Table:
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {data.schema ? `${data.schema}.` : ''}{data.table}
            </div>
            {data.loadStrategy && (
              <div style={{ fontSize: 9, color: asciiColors.muted }}>
                Strategy: {data.loadStrategy}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Configure target
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: asciiColors.accent,
          width: 10,
          height: 10
        }}
      />
    </div>
  );
};

