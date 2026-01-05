import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { JoinNodeData } from '../types';

interface JoinNodeProps {
  data: JoinNodeData;
  selected: boolean;
}

export const JoinNode = ({ data, selected }: JoinNodeProps) => {
  const joinTypeLabels: Record<string, string> = {
    inner: 'INNER JOIN',
    left: 'LEFT JOIN',
    right: 'RIGHT JOIN',
    full: 'FULL OUTER JOIN'
  };

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
        <span>{ascii.blockSemi}</span>
        <span>JOIN</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
          Type:
        </div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {joinTypeLabels[data.joinType] || 'INNER JOIN'}
        </div>
        
        {data.leftTable && data.rightTable ? (
          <>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 2 }}>
              {data.leftTable}.{data.leftColumn} = {data.rightTable}.{data.rightColumn}
            </div>
          </>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Configure join
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
      <Handle
        type="target"
        position={Position.Top}
        id="right"
        style={{
          background: asciiColors.success,
          width: 10,
          height: 10
        }}
      />
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

