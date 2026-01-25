import React, { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';

interface CleanupLayersModalProps {
  warehouseName: string;
  currentLayer: 'BRONZE' | 'SILVER' | 'GOLD';
  onClose: () => void;
  onCleanup: (layers: string[]) => Promise<void>;
}

const CleanupLayersModal: React.FC<CleanupLayersModalProps> = ({
  warehouseName,
  currentLayer,
  onClose,
  onCleanup,
}) => {
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine available layers to clean (all layers except current)
  const availableLayers = ['BRONZE', 'SILVER', 'GOLD'].filter(
    layer => layer !== currentLayer
  );

  const toggleLayer = (layer: string) => {
    setSelectedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedLayers(new Set(availableLayers));
  };

  const deselectAll = () => {
    setSelectedLayers(new Set());
  };

  const handleCleanup = async () => {
    if (selectedLayers.size === 0) {
      setError('Please select at least one layer to clean up');
      return;
    }

    const layersList = Array.from(selectedLayers).join(', ');
    if (!confirm(
      `Are you sure you want to delete the following layer schemas for "${warehouseName}"?\n\n` +
      `Layers: ${layersList}\n\n` +
      `This will permanently delete all data in those schemas and cannot be undone.`
    )) {
      return;
    }

    setIsCleaning(true);
    setError(null);

    try {
      await onCleanup(Array.from(selectedLayers));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean up layers');
    } finally {
      setIsCleaning(false);
    }
  };

  const getLayerDescription = (layer: string) => {
    switch (layer) {
      case 'BRONZE':
        return 'Raw Data';
      case 'SILVER':
        return 'Cleaned & Validated';
      case 'GOLD':
        return 'Business-Ready';
      default:
        return '';
    }
  };

  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'BRONZE':
        return asciiColors.muted;
      case 'SILVER':
        return asciiColors.accent;
      case 'GOLD':
        return asciiColors.success;
      default:
        return asciiColors.foreground;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: asciiColors.background,
          border: `2px solid ${asciiColors.border}`,
          borderRadius: 2,
          width: '90%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AsciiPanel title="CLEANUP PREVIOUS LAYERS">
          <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                fontSize: 11, 
                color: asciiColors.muted, 
                marginBottom: 8,
                fontFamily: 'Consolas'
              }}>
                Warehouse: <strong style={{ color: asciiColors.foreground }}>{warehouseName}</strong>
              </div>
              <div style={{ 
                fontSize: 11, 
                color: asciiColors.muted, 
                marginBottom: 12,
                fontFamily: 'Consolas'
              }}>
                Current Layer: <strong style={{ color: getLayerColor(currentLayer) }}>{currentLayer}</strong> ({getLayerDescription(currentLayer)})
              </div>
              <div style={{ 
                fontSize: 11, 
                color: asciiColors.muted,
                fontFamily: 'Consolas',
                lineHeight: 1.5
              }}>
                Select the layer schemas you want to delete. The current layer ({currentLayer}) cannot be deleted.
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: 16,
                padding: '10px 12px',
                backgroundColor: asciiColors.danger + '20',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                color: asciiColors.danger,
                fontSize: 11,
                fontFamily: 'Consolas',
                wordBreak: 'break-word',
                lineHeight: 1.4
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 12
              }}>
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  Available Layers
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AsciiButton
                    label="Select All"
                    onClick={selectAll}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Deselect All"
                    onClick={deselectAll}
                    variant="ghost"
                  />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 8,
                padding: '12px',
                backgroundColor: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `1px solid ${asciiColors.border}`
              }}>
                {availableLayers.map((layer) => {
                  const isSelected = selectedLayers.has(layer);
                  const normalizedName = warehouseName.toLowerCase().replace(/\s+/g, '_');
                  const schemaName = `${normalizedName}_${layer.toLowerCase()}`;
                  
                  return (
                    <label
                      key={layer}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        backgroundColor: isSelected ? asciiColors.accent + '20' : 'transparent',
                        border: `1px solid ${isSelected ? asciiColors.accent : asciiColors.border}`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        fontFamily: 'Consolas',
                        fontSize: 12,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = asciiColors.accent;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = asciiColors.border;
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLayer(layer)}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: 'pointer',
                          accentColor: asciiColors.accent
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          marginBottom: 4
                        }}>
                          <span style={{ 
                            fontWeight: 600, 
                            color: getLayerColor(layer),
                            fontSize: 12
                          }}>
                            {layer}
                          </span>
                          <span style={{ 
                            fontSize: 10, 
                            color: asciiColors.muted 
                          }}>
                            ({getLayerDescription(layer)})
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: 10, 
                          color: asciiColors.muted,
                          fontFamily: 'Consolas'
                        }}>
                          Schema: <code style={{ 
                            color: asciiColors.accent,
                            backgroundColor: asciiColors.background,
                            padding: '2px 4px',
                            borderRadius: 2
                          }}>{schemaName}</code>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {selectedLayers.size > 0 && (
              <div style={{
                marginBottom: 16,
                padding: '12px',
                backgroundColor: asciiColors.warning + '20',
                border: `1px solid ${asciiColors.warning}`,
                borderRadius: 2,
                fontSize: 11,
                fontFamily: 'Consolas',
                color: asciiColors.foreground,
                lineHeight: 1.5
              }}>
                <strong style={{ color: asciiColors.warning }}>Warning:</strong> This action will permanently delete {selectedLayers.size} layer schema{selectedLayers.size > 1 ? 's' : ''} and all data within them. This cannot be undone.
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 12,
              paddingTop: 12,
              borderTop: `1px solid ${asciiColors.border}`
            }}>
              <AsciiButton
                label="Cancel"
                onClick={onClose}
                variant="ghost"
                disabled={isCleaning}
              />
              <AsciiButton
                label={isCleaning ? 'Cleaning...' : `Delete ${selectedLayers.size > 0 ? `${selectedLayers.size} ` : ''}Layer${selectedLayers.size !== 1 ? 's' : ''}`}
                onClick={handleCleanup}
                disabled={isCleaning || selectedLayers.size === 0}
              />
            </div>
          </div>
        </AsciiPanel>
      </div>
    </div>
  );
};

export default CleanupLayersModal;
