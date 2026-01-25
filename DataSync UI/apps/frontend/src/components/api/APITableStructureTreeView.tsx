import React, { useState } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

interface Column {
  name: string;
  type: string;
}

interface TableStructure {
  schema: string;
  table: string;
  db_engine: string;
  columns: Column[];
}

interface APITableStructureTreeViewProps {
  tableStructure: TableStructure;
}

const APITableStructureTreeView: React.FC<APITableStructureTreeViewProps> = ({ tableStructure }) => {
  const [expanded, setExpanded] = useState(true);

  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push(`${ascii.v}  `);
    }
    
    if (isLast) {
      lines.push(`${ascii.bl}${ascii.h}${ascii.h} `);
    } else {
      lines.push(`${ascii.tRight}${ascii.h}${ascii.h} `);
    }
    
    return <span style={{ 
      color: asciiColors.border, 
      marginRight: 6, 
      fontFamily: "Consolas", 
      fontSize: 11 
    }}>{lines.join('')}</span>;
  };

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {/* Schema Level */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 8px",
          cursor: "pointer",
          borderLeft: `2px solid ${asciiColors.accent}`,
          backgroundColor: expanded ? asciiColors.backgroundSoft : asciiColors.background,
          transition: "all 0.15s ease",
          marginBottom: 2
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.backgroundColor = asciiColors.background;
          }
        }}
      >
        <span style={{
          marginRight: 8,
          color: expanded ? asciiColors.accent : asciiColors.muted,
          fontSize: 10,
          transition: "transform 0.15s ease",
          display: "inline-block",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)"
        }}>
          {ascii.arrowRight}
        </span>
        <span style={{
          fontWeight: 600,
          color: asciiColors.accent,
          fontSize: 12,
          flex: 1
        }}>
          {tableStructure.schema}
        </span>
        <span style={{
          padding: "2px 8px",
          borderRadius: 2,
          fontSize: 10,
          fontWeight: 500,
          border: `1px solid ${asciiColors.border}`,
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.foreground
        }}>
          {tableStructure.db_engine}
        </span>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 24 }}>
          {/* Table Level */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 8px",
              marginLeft: 8,
              marginBottom: 2,
              borderLeft: `2px solid ${asciiColors.border}`,
              backgroundColor: asciiColors.background,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              e.currentTarget.style.borderLeftColor = asciiColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = asciiColors.background;
              e.currentTarget.style.borderLeftColor = asciiColors.border;
            }}
          >
            <span style={{ 
              color: asciiColors.muted, 
              fontSize: 10,
              lineHeight: "1.5",
              paddingTop: "2px",
              flexShrink: 0,
              width: "12px",
              fontFamily: "Consolas"
            }}>
              {ascii.bl}
            </span>
            <span style={{ 
              color: asciiColors.accent,
              fontSize: 11,
              fontWeight: 600,
              marginLeft: 8
            }}>
              {tableStructure.table}
            </span>
          </div>

          {/* Columns */}
          {tableStructure.columns.map((col, index) => {
            const isLast = index === tableStructure.columns.length - 1;
            return (
              <div
                key={col.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  padding: "6px 8px",
                  marginLeft: 8,
                  marginBottom: 2,
                  borderLeft: `1px solid ${asciiColors.border}`,
                  backgroundColor: "transparent",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                  e.currentTarget.style.borderLeftColor = asciiColors.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.borderLeftColor = asciiColors.border;
                }}
              >
                {renderTreeLine(2, isLast)}
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ 
                    fontWeight: 500,
                    color: asciiColors.accent,
                    fontSize: 11,
                    fontFamily: "Consolas"
                  }}>
                    {col.name}
                  </span>
                  <span style={{ 
                    color: asciiColors.muted,
                    fontSize: 10,
                    fontFamily: "Consolas"
                  }}>
                    {ascii.v} {col.type}
                  </span>
                  <span style={{ 
                    color: asciiColors.muted,
                    fontSize: 10,
                    fontFamily: "Consolas",
                    marginLeft: "auto"
                  }}>
                    #{index + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default APITableStructureTreeView;
