import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { AggregateNodeData } from '../types';

interface AggregateNodeProps {
  data: AggregateNodeData;
  selected: boolean;
}

export const AggregateNode = ({ data, selected }: AggregateNodeProps) => {
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
        <span>AGGREGATE</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        {data.groupBy && data.groupBy.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              GROUP BY:
            </div>
            <div style={{ fontSize: 9 }}>
              {data.groupBy.join(', ')}
            </div>
          </div>
        )}
        
        {data.aggregations && data.aggregations.length > 0 ? (
          <div>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              Functions ({data.aggregations.length}):
            </div>
            {data.aggregations.slice(0, 2).map((agg, idx) => (
              <div key={idx} style={{ fontSize: 9, marginBottom: 2 }}>
                {agg.function.toUpperCase()}({agg.column})
              </div>
            ))}
            {data.aggregations.length > 2 && (
              <div style={{ fontSize: 9, color: asciiColors.muted }}>
                +{data.aggregations.length - 2} more
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Add aggregations
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

