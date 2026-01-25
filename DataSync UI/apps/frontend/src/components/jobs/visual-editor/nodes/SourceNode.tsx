import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { SourceNodeData } from '../types';

interface SourceNodeProps {
  data: SourceNodeData;
  selected: boolean;
}

export const SourceNode = ({ data, selected }: SourceNodeProps) => {
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
        <span>SOURCE</span>
      </div>
      
      {data.table ? (
        <div style={{ color: asciiColors.foreground }}>
          <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
            Table:
          </div>
          <div style={{ fontWeight: 600 }}>
            {data.schema ? `${data.schema}.` : ''}{data.table}
          </div>
        </div>
      ) : data.query ? (
        <div style={{ color: asciiColors.foreground }}>
          <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
            Custom Query:
          </div>
          <div style={{
            fontSize: 9,
            maxHeight: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {data.query.substring(0, 50)}...
          </div>
        </div>
      ) : (
        <div style={{ color: asciiColors.muted, fontSize: 10 }}>
          Configure source
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: asciiColors.accent,
          width: 10,
          height: 10
        }}
      />
    </div>
  );
};

