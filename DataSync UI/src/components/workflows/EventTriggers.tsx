import React, { useState, useEffect, useCallback, useRef } from 'react';
import { eventTriggerApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const EventTriggers = () => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchTriggers = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await eventTriggerApi.getTriggers();
      if (isMountedRef.current) {
        setTriggers(data);
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
    fetchTriggers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTriggers]);

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
          {ascii.blockFull} EVENT TRIGGERS
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

        <AsciiPanel title="EVENT TRIGGERS">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {triggers.map((trigger, idx) => (
              <div
                key={idx}
                style={{
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  marginBottom: theme.spacing.xs
                }}
              >
                <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                  {trigger.workflow_name} - {trigger.event_type}
                </div>
                <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                  Active: {trigger.active ? 'Yes' : 'No'}
                </div>
              </div>
            ))}
          </div>
        </AsciiPanel>
      </div>
    </Container>
  );
};

export default EventTriggers;
