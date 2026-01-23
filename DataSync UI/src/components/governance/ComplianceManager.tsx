import React, { useState, useEffect, useCallback, useRef } from 'react';
import { complianceApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const ComplianceManager = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'consents' | 'breaches'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [breaches, setBreaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchRequests = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await complianceApi.getRequests();
      if (isMountedRef.current) {
        setRequests(data);
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

  const fetchConsents = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await complianceApi.getConsents();
      if (isMountedRef.current) {
        setConsents(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  const fetchBreaches = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await complianceApi.getBreaches();
      if (isMountedRef.current) {
        setBreaches(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'consents') {
      fetchConsents();
    } else if (activeTab === 'breaches') {
      fetchBreaches();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [activeTab, fetchRequests, fetchConsents, fetchBreaches]);

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
          {ascii.blockFull} COMPLIANCE MANAGER
        </h1>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <AsciiButton
            label="Requests"
            onClick={() => setActiveTab('requests')}
            variant={activeTab === 'requests' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Consents"
            onClick={() => setActiveTab('consents')}
            variant={activeTab === 'consents' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Breaches"
            onClick={() => setActiveTab('breaches')}
            variant={activeTab === 'breaches' ? 'primary' : 'ghost'}
          />
        </div>

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

        {activeTab === 'requests' && (
          <AsciiPanel title="DATA SUBJECT REQUESTS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {requests.map((req) => (
                <div
                  key={req.request_id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {req.request_type} - {req.request_status}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {req.data_subject_email || req.data_subject_name}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'consents' && (
          <AsciiPanel title="CONSENT RECORDS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {consents.map((consent) => (
                <div
                  key={consent.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {consent.schema_name}.{consent.table_name} - {consent.consent_status}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'breaches' && (
          <AsciiPanel title="BREACH NOTIFICATIONS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {breaches.map((breach) => (
                <div
                  key={breach.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {breach.breach_type} - {breach.status}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {breach.schema_name}.{breach.table_name}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}
      </div>
    </Container>
  );
};

export default ComplianceManager;
