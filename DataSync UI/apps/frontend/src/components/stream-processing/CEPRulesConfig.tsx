import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { streamProcessingApi, type CEPRule, type CEPMatch } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const CEPRulesConfig: React.FC = () => {
  const [rules, setRules] = useState<CEPRule[]>([]);
  const [matches, setMatches] = useState<CEPMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CEPRule | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [formData, setFormData] = useState<Partial<CEPRule>>({
    ruleId: '',
    name: '',
    description: '',
    pattern: { sequence: [] },
    conditions: {},
    actions: {},
    enabled: true,
    windowSeconds: 300
  });
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRules = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const response = await streamProcessingApi.getCEPRules();
      if (isMountedRef.current) {
        setRules(response || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        if (err?.response?.status === 404) {
          setRules([]);
          return;
        }
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchMatches = useCallback(async (ruleId?: string) => {
    try {
      const response = await streamProcessingApi.getCEPMatches(ruleId);
      setMatches(response || []);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setMatches([]);
        return;
      }
      setError(extractApiError(err));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    fetchRules();
    fetchMatches();

    refreshIntervalRef.current = setInterval(() => {
      fetchRules();
      fetchMatches();
    }, 10000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchRules, fetchMatches]);

  const handleCreateRule = useCallback(async () => {
    if (!formData.ruleId || !formData.name || !formData.pattern) {
      setError('Rule ID, name, and pattern are required');
      return;
    }

    try {
      await streamProcessingApi.createCEPRule(formData as CEPRule);
      setShowCreateModal(false);
      setFormData({
        ruleId: '',
        name: '',
        description: '',
        pattern: { sequence: [] },
        conditions: {},
        actions: {},
        enabled: true,
        windowSeconds: 300
      });
      await fetchRules();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [formData, fetchRules]);

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await streamProcessingApi.deleteCEPRule(ruleId);
      await fetchRules();
      if (selectedRule?.ruleId === ruleId) {
        setSelectedRule(null);
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [selectedRule, fetchRules]);

  const handleViewMatches = useCallback(async (ruleId: string) => {
    setSelectedRule(rules.find(r => r.ruleId === ruleId) || null);
    await fetchMatches(ruleId);
    setShowMatches(true);
  }, [rules, fetchMatches]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <h3 style={{ fontSize: 14 }}>CEP Rules</h3>
        <AsciiButton onClick={() => setShowCreateModal(true)}>
          Create Rule
        </AsciiButton>
      </div>

      {error && (
        <div style={{
          padding: theme.spacing.md,
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          backgroundColor: asciiColors.backgroundSoft,
          color: asciiColors.foreground,
          marginBottom: theme.spacing.md
        }}>
          {error}
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: theme.spacing.lg
        }}>
          <div style={{
            backgroundColor: asciiColors.background,
            border: `2px solid ${asciiColors.border}`,
            borderRadius: 2,
            padding: theme.spacing.xl,
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>Create CEP Rule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Rule ID *
                </label>
                <input
                  type="text"
                  value={formData.ruleId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ruleId: e.target.value }))}
                  placeholder="rule-1"
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="High Temperature Alert"
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Pattern (JSON) *
                </label>
                <textarea
                  value={JSON.stringify(formData.pattern || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setFormData(prev => ({ ...prev, pattern: JSON.parse(e.target.value) }));
                    } catch {}
                  }}
                  rows={8}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 11
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.foreground }}>
                  Window Seconds
                </label>
                <input
                  type="number"
                  value={formData.windowSeconds || 300}
                  onChange={(e) => setFormData(prev => ({ ...prev, windowSeconds: parseInt(e.target.value) || 300 }))}
                  min="1"
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end', marginTop: theme.spacing.md }}>
                <AsciiButton onClick={() => setShowCreateModal(false)}>
                  Cancel
                </AsciiButton>
                <AsciiButton onClick={handleCreateRule}>
                  Create
                </AsciiButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg }}>
        <div>
          <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm }}>Rules</h4>
          {rules.length === 0 ? (
            <div style={{
              padding: theme.spacing.lg,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              textAlign: 'center',
              color: asciiColors.muted
            }}>
              No CEP rules configured
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {rules.map((rule) => (
                <div
                  key={rule.ruleId}
                  style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${selectedRule?.ruleId === rule.ruleId ? asciiColors.accent : asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: selectedRule?.ruleId === rule.ruleId ? asciiColors.backgroundSoft : asciiColors.background,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedRule(rule)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: theme.spacing.xs }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: asciiColors.foreground, marginBottom: theme.spacing.xs }}>
                        {rule.name}
                      </div>
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        {rule.description || rule.ruleId}
                      </div>
                    </div>
                    <div style={{
                      padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                      border: `1px solid ${rule.enabled ? asciiColors.accent : asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: rule.enabled ? asciiColors.accent : 'transparent',
                      color: rule.enabled ? '#ffffff' : asciiColors.foreground,
                      fontSize: 10,
                      textTransform: 'uppercase'
                    }}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                    <AsciiButton onClick={(e) => {
                      e.stopPropagation();
                      handleViewMatches(rule.ruleId);
                    }}>
                      View Matches
                    </AsciiButton>
                    <AsciiButton onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRule(rule.ruleId);
                    }}>
                      Delete
                    </AsciiButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showMatches && (
          <div>
            <h4 style={{ fontSize: 12, marginBottom: theme.spacing.sm }}>
              Matches {selectedRule && `- ${selectedRule.name}`}
            </h4>
            {matches.length === 0 ? (
              <div style={{
                padding: theme.spacing.lg,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                textAlign: 'center',
                color: asciiColors.muted
              }}>
                No matches found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, maxHeight: '600px', overflowY: 'auto' }}>
                {matches.map((match) => (
                  <div
                    key={match.matchId}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      backgroundColor: asciiColors.backgroundSoft
                    }}
                  >
                    <div style={{ fontSize: 11, color: asciiColors.muted, marginBottom: theme.spacing.xs }}>
                      {new Date(match.matchTime).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                      Matched Events: {match.matchedEvents?.length || 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CEPRulesConfig;
