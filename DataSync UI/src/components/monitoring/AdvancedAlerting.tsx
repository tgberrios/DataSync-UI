import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { monitoringApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface Integration {
  integration_id: string;
  type: string;
  name: string;
  integration_key?: string;
  api_key?: string;
  service_id?: string;
  team_id?: string;
  enabled: boolean;
  severity_mapping?: Record<string, string>;
}

interface Incident {
  incident_id: string;
  integration_id: string;
  external_id?: string;
  alert_id?: number;
  status: string;
  created_at: string;
  resolved_at?: string;
}

const AdvancedAlerting = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({
    integration_id: '',
    type: 'pagerduty',
    name: '',
    enabled: true,
    severity_mapping: {}
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [integrationsData, incidentsData] = await Promise.all([
        monitoringApi.getAlertingIntegrations().catch(() => []),
        monitoringApi.getIncidents().catch(() => [])
      ]);
      setIntegrations(integrationsData || []);
      setIncidents(incidentsData || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateIntegration = useCallback(async () => {
    try {
      if (!newIntegration.integration_id || !newIntegration.name) {
        setError('Integration ID and name are required');
        return;
      }
      if (newIntegration.type === 'pagerduty' && !newIntegration.integration_key) {
        setError('Integration Key is required for PagerDuty');
        return;
      }
      if (newIntegration.type === 'opsgenie' && !newIntegration.api_key) {
        setError('API Key is required for Opsgenie');
        return;
      }
      await monitoringApi.createAlertingIntegration(newIntegration as Integration);
      setShowIntegrationModal(false);
      setNewIntegration({
        integration_id: '',
        type: 'pagerduty',
        name: '',
        enabled: true,
        severity_mapping: {}
      });
      fetchData();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [newIntegration, fetchData]);

  const handleTestAlert = useCallback(async (integrationId: string) => {
    try {
      await monitoringApi.triggerAlert({
        integration_id: integrationId,
        title: 'Test Alert',
        message: 'This is a test alert from DataSync',
        source: 'datasync'
      });
      fetchData();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return asciiColors.success;
      case 'acknowledged': return asciiColors.warning;
      case 'triggered': return asciiColors.error;
      default: return asciiColors.muted;
    }
  };

  if (loading && integrations.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md
          }}>
            Advanced Alerting
          </h1>
          <p style={{
            color: asciiColors.muted,
            fontSize: 12,
            marginBottom: theme.spacing.lg
          }}>
            Configure PagerDuty and Opsgenie integrations for advanced alerting
          </p>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiButton
              label="Add Integration"
              onClick={() => setShowIntegrationModal(true)}
            />
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              background: asciiColors.error,
              color: '#ffffff',
              marginBottom: theme.spacing.md,
              borderRadius: 2,
              fontSize: 12
            }}>
              {error}
            </div>
          )}

          {/* Integrations */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Integrations ({integrations.length})
            </h3>
            {integrations.length === 0 ? (
              <div style={{
                padding: theme.spacing.lg,
                textAlign: 'center',
                color: asciiColors.muted,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2
              }}>
                No integrations configured
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {integrations.map((integration) => (
                  <div
                    key={integration.integration_id}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${asciiColors.border}`,
                      borderRadius: 2,
                      background: asciiColors.background
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.sm
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{integration.name}</span>
                        <span style={{
                          fontSize: 11,
                          color: asciiColors.muted,
                          marginLeft: theme.spacing.sm,
                          textTransform: 'uppercase'
                        }}>
                          {integration.type}
                        </span>
                        <span style={{
                          fontSize: 11,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          background: integration.enabled ? asciiColors.success : asciiColors.muted,
                          color: '#ffffff',
                          marginLeft: theme.spacing.sm,
                          borderRadius: 2
                        }}>
                          {integration.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <AsciiButton
                        label="Test Alert"
                        onClick={() => handleTestAlert(integration.integration_id)}
                      />
                    </div>
                    {integration.service_id && (
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        Service ID: {integration.service_id}
                      </div>
                    )}
                    {integration.team_id && (
                      <div style={{ fontSize: 11, color: asciiColors.muted }}>
                        Team ID: {integration.team_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incidents */}
          <div>
            <h3 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.md
            }}>
              Recent Incidents ({incidents.length})
            </h3>
            {incidents.length === 0 ? (
              <div style={{
                padding: theme.spacing.lg,
                textAlign: 'center',
                color: asciiColors.muted,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2
              }}>
                No incidents
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: theme.spacing.md
              }}>
                {incidents.map((incident) => (
                  <div
                    key={incident.incident_id}
                    style={{
                      padding: theme.spacing.md,
                      border: `1px solid ${getStatusColor(incident.status)}`,
                      borderRadius: 2,
                      background: asciiColors.background
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.xs
                    }}>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{incident.incident_id}</span>
                      <span style={{
                        fontSize: 11,
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        background: getStatusColor(incident.status),
                        color: '#ffffff',
                        borderRadius: 2,
                        textTransform: 'uppercase'
                      }}>
                        {incident.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>
                      Created: {new Date(incident.created_at).toLocaleString()}
                      {incident.resolved_at && ` | Resolved: ${new Date(incident.resolved_at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Modal */}
          {showIntegrationModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                padding: theme.spacing.lg,
                maxWidth: 600,
                width: '90%'
              }}>
                <h2 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: asciiColors.foreground,
                  marginBottom: theme.spacing.md
                }}>
                  Create Integration
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  <input
                    type="text"
                    placeholder="Integration ID"
                    value={newIntegration.integration_id}
                    onChange={(e) => setNewIntegration({ ...newIntegration, integration_id: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Integration Name"
                    value={newIntegration.name}
                    onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  />
                  <select
                    value={newIntegration.type}
                    onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value })}
                    style={{
                      padding: theme.spacing.sm,
                      border: `1px solid ${asciiColors.border}`,
                      background: asciiColors.background,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas, monospace',
                      fontSize: 12,
                      borderRadius: 2
                    }}
                  >
                    <option value="pagerduty">PagerDuty</option>
                    <option value="opsgenie">Opsgenie</option>
                  </select>
                  {newIntegration.type === 'pagerduty' && (
                    <>
                      <input
                        type="text"
                        placeholder="Integration Key"
                        value={newIntegration.integration_key || ''}
                        onChange={(e) => setNewIntegration({ ...newIntegration, integration_key: e.target.value })}
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${asciiColors.border}`,
                          background: asciiColors.background,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          borderRadius: 2
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Service ID (optional)"
                        value={newIntegration.service_id || ''}
                        onChange={(e) => setNewIntegration({ ...newIntegration, service_id: e.target.value })}
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${asciiColors.border}`,
                          background: asciiColors.background,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          borderRadius: 2
                        }}
                      />
                    </>
                  )}
                  {newIntegration.type === 'opsgenie' && (
                    <>
                      <input
                        type="text"
                        placeholder="API Key"
                        value={newIntegration.api_key || ''}
                        onChange={(e) => setNewIntegration({ ...newIntegration, api_key: e.target.value })}
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${asciiColors.border}`,
                          background: asciiColors.background,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          borderRadius: 2
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Team ID (optional)"
                        value={newIntegration.team_id || ''}
                        onChange={(e) => setNewIntegration({ ...newIntegration, team_id: e.target.value })}
                        style={{
                          padding: theme.spacing.sm,
                          border: `1px solid ${asciiColors.border}`,
                          background: asciiColors.background,
                          color: asciiColors.foreground,
                          fontFamily: 'Consolas, monospace',
                          fontSize: 12,
                          borderRadius: 2
                        }}
                      />
                    </>
                  )}
                  <div style={{ display: 'flex', gap: theme.spacing.md }}>
                    <AsciiButton
                      label="Create"
                      onClick={handleCreateIntegration}
                    />
                    <AsciiButton
                      label="Cancel"
                      onClick={() => setShowIntegrationModal(false)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default AdvancedAlerting;
