import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { TransformNodeData } from '../types';

interface TransformNodeProps {
  data: TransformNodeData;
  selected: boolean;
}

export const TransformNode = ({ data, selected }: TransformNodeProps) => {
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
        <span>TRANSFORM</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        {data.transforms && data.transforms.length > 0 ? (
          <div>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              Transforms ({data.transforms.length}):
            </div>
            {data.transforms.slice(0, 2).map((transform, idx) => (
              <div key={idx} style={{ fontSize: 9, marginBottom: 2 }}>
                {transform.target_column} = {transform.expression.substring(0, 30)}...
              </div>
            ))}
            {data.transforms.length > 2 && (
              <div style={{ fontSize: 9, color: asciiColors.muted }}>
                +{data.transforms.length - 2} more
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Add transformations
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

