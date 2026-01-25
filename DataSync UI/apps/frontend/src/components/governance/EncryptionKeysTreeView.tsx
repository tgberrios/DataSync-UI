import React, { useState, useMemo } from 'react';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import type { EncryptionKey } from '../../services/api';

interface AlgorithmNode {
  algorithm: string;
  keys: EncryptionKey[];
}

interface EncryptionKeysTreeViewProps {
  keys: EncryptionKey[];
}

const EncryptionKeysTreeView: React.FC<EncryptionKeysTreeViewProps> = ({ 
  keys
}) => {
  const [expandedAlgorithms, setExpandedAlgorithms] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const algorithms = new Map<string, AlgorithmNode>();

    keys.forEach(key => {
      const algorithm = key.algorithm || 'Unknown';

      if (!algorithms.has(algorithm)) {
        algorithms.set(algorithm, {
          algorithm,
          keys: []
        });
      }

      algorithms.get(algorithm)!.keys.push(key);
    });

    return Array.from(algorithms.values()).sort((a, b) => a.algorithm.localeCompare(b.algorithm));
  }, [keys]);

  const toggleAlgorithm = (algorithm: string) => {
    setExpandedAlgorithms(prev => {
      const next = new Set(prev);
      if (next.has(algorithm)) {
        next.delete(algorithm);
      } else {
        next.add(algorithm);
      }
      return next;
    });
  };

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

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (keys.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        No encryption keys found. Create one above.
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((algorithmNode, algIdx) => {
        const isAlgorithmExpanded = expandedAlgorithms.has(algorithmNode.algorithm);
        const isAlgorithmLast = algIdx === treeData.length - 1;

        return (
          <div key={algorithmNode.algorithm} style={{ marginBottom: 4 }}>
            {/* Algorithm Level */}
            <div
              onClick={() => toggleAlgorithm(algorithmNode.algorithm)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isAlgorithmExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isAlgorithmExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isAlgorithmExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isAlgorithmExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                fontWeight: 600,
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {algorithmNode.algorithm}
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
                {algorithmNode.keys.length}
              </span>
            </div>

            {isAlgorithmExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {algorithmNode.keys.map((key, keyIdx) => {
                  const isKeyLast = keyIdx === algorithmNode.keys.length - 1;

                  return (
                    <div
                      key={key.key_id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        padding: "8px 8px",
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
                      {renderTreeLine(1, isKeyLast)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <code style={{
                            fontWeight: 600,
                            color: asciiColors.accent,
                            fontSize: 11,
                            fontFamily: 'Consolas'
                          }}>
                            {key.key_id}
                          </code>
                          {key.rotation_count !== undefined && key.rotation_count > 0 && (
                            <span style={{
                              padding: "2px 6px",
                              borderRadius: 2,
                              fontSize: 10,
                              fontWeight: 500,
                              border: `1px solid ${asciiColors.border}`,
                              color: asciiColors.muted,
                              backgroundColor: "transparent"
                            }}>
                              {key.rotation_count} rotations
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                          Created: {formatDate(key.created_at)}
                        </div>
                        {key.last_used_at && (
                          <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                            Last Used: {formatDate(key.last_used_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EncryptionKeysTreeView;
