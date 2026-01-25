import { Handle, Position } from 'reactflow';
import { asciiColors, ascii } from '../../../../ui/theme/asciiTheme';
import type { LookupNodeData } from '../types';

interface LookupNodeProps {
  data: LookupNodeData;
  selected: boolean;
}

export const LookupNode = ({ data, selected }: LookupNodeProps) => {
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
        <span>LOOKUP</span>
      </div>
      
      <div style={{ color: asciiColors.foreground }}>
        {data.lookupTable ? (
          <>
            <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
              Table:
            </div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {data.lookupSchema ? `${data.lookupSchema}.` : ''}{data.lookupTable}
            </div>
            {data.sourceColumns.length > 0 && (
              <div style={{ fontSize: 9, color: asciiColors.muted }}>
                {data.sourceColumns.length} source columns
              </div>
            )}
          </>
        ) : (
          <div style={{ color: asciiColors.muted, fontSize: 10 }}>
            Configure lookup
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

