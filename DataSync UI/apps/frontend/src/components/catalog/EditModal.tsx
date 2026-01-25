import { useState, useCallback } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CatalogEntry } from '../../services/api';

interface EditModalProps {
  entry: CatalogEntry;
  onClose: () => void;
  onSave: (entry: CatalogEntry) => void;
}

/**
 * Edit Modal component
 * Modal dialog for editing catalog entry configurations
 */
const EditModal: React.FC<EditModalProps> = ({ entry, onClose, onSave }) => {
  const [editedEntry, setEditedEntry] = useState(entry);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave(editedEntry);
    handleClose();
  }, [editedEntry, onSave, handleClose]);

  return (
    <>
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: "blur(5px)",
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 999,
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={handleClose}
      />
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          animation: isClosing ? "fadeOut 0.15s ease-out" : "fadeIn 0.15s ease-in"
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div 
          style={{
            minWidth: 550,
            maxWidth: 650,
            animation: isClosing ? "slideDown 0.15s ease-out" : "slideUp 0.2s ease-out"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            border: `2px solid ${asciiColors.border}`,
            backgroundColor: asciiColors.background,
            fontFamily: "Consolas",
            fontSize: 12,
            color: asciiColors.foreground,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: `2px solid ${asciiColors.border}`,
              backgroundColor: asciiColors.backgroundSoft
            }}>
              <h2 style={{
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
                fontFamily: "Consolas",
                color: asciiColors.foreground,
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>
                <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
                EDIT TABLE CONFIGURATION
              </h2>
            </div>
            
            <div style={{
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 20
            }}>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Table
                </label>
                <div style={{
                  padding: "10px 12px",
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.backgroundSoft,
                  color: asciiColors.muted,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  borderRadius: 2
                }}>
                  {editedEntry.schema_name}.{editedEntry.table_name}
                </div>
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Engine
                </label>
                <div style={{
                  padding: "10px 12px",
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.backgroundSoft,
                  color: asciiColors.muted,
                  fontSize: 12,
                  fontFamily: "Consolas",
                  borderRadius: 2
                }}>
                  {editedEntry.db_engine}
                </div>
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Status
                </label>
                <input
                  type="text"
                  value={editedEntry.status}
                  onChange={(e) => setEditedEntry({...editedEntry, status: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Active
                </label>
                <select
                  value={editedEntry.active.toString()}
                  onChange={(e) => setEditedEntry({...editedEntry, active: e.target.value === 'true'})}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: "pointer",
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Cluster
                </label>
                <input
                  type="text"
                  value={editedEntry.cluster_name || ''}
                  onChange={(e) => setEditedEntry({...editedEntry, cluster_name: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 11,
                  fontFamily: "Consolas",
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  {ascii.v} Cron Schedule
                </label>
                <input
                  type="text"
                  value={editedEntry.cron_schedule || ''}
                  onChange={(e) => setEditedEntry({...editedEntry, cron_schedule: e.target.value || null})}
                  placeholder="e.g., 0 */6 * * *"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: "Consolas",
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    outline: "none",
                    transition: "border-color 0.2s ease"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${asciiColors.accentLight}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = asciiColors.border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ 
                  marginTop: 4, 
                  fontSize: 10, 
                  color: asciiColors.muted,
                  fontFamily: "Consolas",
                  lineHeight: 1.4
                }}>
                  Format: minute hour day month day-of-week. Leave empty to disable cron scheduling.
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 12,
                paddingTop: 20,
                borderTop: `1px solid ${asciiColors.border}`
              }}>
                <AsciiButton
                  label="Cancel"
                  onClick={handleClose}
                  variant="ghost"
                />
                <AsciiButton
                  label="Save Changes"
                  onClick={handleSave}
                  variant="primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
      `}</style>
    </>
  );
};

export default EditModal;
