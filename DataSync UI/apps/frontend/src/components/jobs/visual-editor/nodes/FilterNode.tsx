import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { FilterNodeData } from '../types';

interface FilterNodeProps {
  data: FilterNodeData;
  selected: boolean;
}

export const FilterNode = ({ data, selected }: FilterNodeProps) => {
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
        <span>FILTER</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        {data.conditions && data.conditions.length > 0 ? (
          <div>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              Conditions ({data.conditions.length}):
            </div>
            {data.conditions.slice(0, 2).map((cond, idx) => (
              <div key={idx} style={{ fontSize: 9, marginBottom: 2 }}>
                {cond.column} {cond.op} {String(cond.value).substring(0, 20)}
              </div>
            ))}
            {data.conditions.length > 2 && (
              <div style={{ fontSize: 9, color: asciiColors.muted }}>
                +{data.conditions.length - 2} more
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Add filter conditions
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

