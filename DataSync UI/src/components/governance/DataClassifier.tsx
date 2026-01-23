import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dataClassifierApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

const DataClassifier = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'results'>('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchRules = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await dataClassifierApi.getRules();
      if (isMountedRef.current) {
        setRules(data);
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

  const fetchResults = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await dataClassifierApi.getResults();
      if (isMountedRef.current) {
        setResults(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'rules') {
      fetchRules();
    } else if (activeTab === 'results') {
      fetchResults();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [activeTab, fetchRules, fetchResults]);

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
          {ascii.blockFull} DATA CLASSIFIER
        </h1>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <AsciiButton
            label="Rules"
            onClick={() => setActiveTab('rules')}
            variant={activeTab === 'rules' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Results"
            onClick={() => setActiveTab('results')}
            variant={activeTab === 'results' ? 'primary' : 'ghost'}
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

        {activeTab === 'rules' && (
          <AsciiPanel title="CLASSIFICATION RULES">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {rule.rule_name} ({rule.rule_type})
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    Priority: {rule.priority} | Active: {rule.active ? 'Yes' : 'No'}
                  </div>
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'results' && (
          <AsciiPanel title="CLASSIFICATION RESULTS">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {results.map((result) => (
                <div
                  key={result.id}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {result.schema_name}.{result.table_name}
                    {result.column_name && `.${result.column_name}`}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    Category: {result.data_category} | Sensitivity: {result.sensitivity_level}
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

export default DataClassifier;
