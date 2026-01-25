import React, { useState, useEffect, useCallback, useRef } from 'react';
import { transformationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const Transformations = () => {
  const [transformations, setTransformations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchTransformations = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await transformationsApi.getTransformations();
      if (isMountedRef.current) {
        setTransformations(data);
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
    fetchTransformations();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTransformations]);

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
          {ascii.blockFull} TRANSFORMATIONS
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

        <AsciiPanel title="TRANSFORMATION LIBRARY">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {transformations.map((transformation) => (
              <div
                key={transformation.id}
                style={{
                  padding: theme.spacing.sm,
                  border: `1px solid ${asciiColors.border}`,
                  marginBottom: theme.spacing.xs
                }}
              >
                <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                  {transformation.name} ({transformation.transformation_type})
                </div>
                {transformation.description && (
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {transformation.description}
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

export default Transformations;
