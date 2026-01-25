import React, { useState, useEffect, useCallback, useRef } from 'react';
import { schemaChangeApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const SchemaChangeAuditor = () => {
  const [auditRecords, setAuditRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const isMountedRef = useRef(true);

  const fetchAudit = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await schemaChangeApi.getAudit();
      if (isMountedRef.current) {
        setAuditRecords(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAudit();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAudit]);

  if (loading) {
    return (
      <Container>
        <SkeletonLoader />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ 
        padding: theme.spacing.lg, 
        fontFamily: 'Consolas', 
        fontSize: 12,
        background: asciiColors.background
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: `0 0 ${theme.spacing.md} 0`,
          color: asciiColors.foreground
        }}>
          {ascii.blockFull} SCHEMA CHANGE AUDITOR
        </h1>

        {error && (
          <div style={{ 
            padding: theme.spacing.sm, 
            background: asciiColors.foreground + '20',
            border: `1px solid ${asciiColors.foreground}`,
            marginBottom: theme.spacing.md,
            color: asciiColors.foreground
          }}>
            Error: {error}
          </div>
        )}

        <AsciiPanel title="SCHEMA CHANGES">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {auditRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                style={{
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  marginBottom: theme.spacing.xs,
                  cursor: 'pointer',
                  background: selectedRecord?.id === record.id ? asciiColors.accent + '20' : 'transparent'
                }}
              >
                <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                  {record.change_type} {record.object_type}: {record.object_name}
                </div>
                <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                  {record.db_engine} | {record.schema_name} | {new Date(record.detected_at).toLocaleString()}
                </div>
                {record.is_rollback_possible && (
                  <div style={{ color: asciiColors.accent, fontSize: 10, marginTop: theme.spacing.xs }}>
                    Rollback available
                  </div>
                )}
              </div>
            ))}
          </div>
        </AsciiPanel>
      </div>
    </Container>
  );
};

export default SchemaChangeAuditor;
