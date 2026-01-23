import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dataRetentionApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const DataRetention = () => {
  const [activeTab, setActiveTab] = useState<'policies' | 'jobs' | 'legal-holds'>('policies');
  const [policies, setPolicies] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [legalHolds, setLegalHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchPolicies = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await dataRetentionApi.getPolicies();
      if (isMountedRef.current) {
        setPolicies(data);
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

  const fetchJobs = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await dataRetentionApi.getJobs();
      if (isMountedRef.current) {
        setJobs(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  const fetchLegalHolds = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await dataRetentionApi.getLegalHolds();
      if (isMountedRef.current) {
        setLegalHolds(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'policies') {
      fetchPolicies();
    } else if (activeTab === 'jobs') {
      fetchJobs();
    } else if (activeTab === 'legal-holds') {
      fetchLegalHolds();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [activeTab, fetchPolicies, fetchJobs, fetchLegalHolds]);

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
          {ascii.blockFull} DATA RETENTION
        </h1>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <AsciiButton
            label="Policies"
            onClick={() => setActiveTab('policies')}
            variant={activeTab === 'policies' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Jobs"
            onClick={() => setActiveTab('jobs')}
            variant={activeTab === 'jobs' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Legal Holds"
            onClick={() => setActiveTab('legal-holds')}
            variant={activeTab === 'legal-holds' ? 'primary' : 'ghost'}
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

        {activeTab === 'policies' && (
          <AsciiPanel title="RETENTION POLICIES">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {policies.map((policy, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {policy.schema_name}.{policy.table_name}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    Retention: {policy.retention_period}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'jobs' && (
          <AsciiPanel title="RETENTION JOBS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {jobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {job.job_type} - {job.status}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {job.schema_name}.{job.table_name}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'legal-holds' && (
          <AsciiPanel title="LEGAL HOLDS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {legalHolds.map((hold) => (
                <div
                  key={hold.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {hold.schema_name}.{hold.table_name}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {hold.reason}
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

export default DataRetention;
