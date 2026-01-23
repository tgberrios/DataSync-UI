import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { WebhookModal } from './WebhookModal';
import AlertRules from './AlertRules';
import WebhooksTreeView from './WebhooksTreeView';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';
import { extractApiError } from '../../utils/errorHandler';

interface Webhook {
  id: number;
  name: string;
  webhook_type: string;
  url?: string;
  api_key?: string;
  bot_token?: string;
  chat_id?: string;
  email_address?: string;
  log_levels?: string[];
  log_categories?: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const Webhooks = () => {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'alert-rules'>('webhooks');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showWebhooksPlaybook, setShowWebhooksPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchWebhooks = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setError(null);
      const response = await fetch('/api/webhooks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch webhooks');
      }
      
      const data = await response.json();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        const normalizedData = data.map((webhook: any) => ({
          ...webhook,
          log_levels: Array.isArray(webhook.log_levels) ? webhook.log_levels : [],
          log_categories: Array.isArray(webhook.log_categories) ? webhook.log_categories : []
        }));
        setWebhooks(normalizedData);
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
    fetchWebhooks();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchWebhooks]);

  const handleSave = useCallback(async (webhookData: any) => {
    try {
      setError(null);
      const url = editingWebhook 
        ? `/api/webhooks/${editingWebhook.id}`
        : '/api/webhooks';
      const method = editingWebhook ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save webhook';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      await fetchWebhooks();
      setShowModal(false);
      setEditingWebhook(null);
      alert(`Webhook "${webhookData.name}" ${editingWebhook ? 'updated' : 'created'} successfully.`);
    } catch (err: any) {
      setError(extractApiError(err));
      throw err;
    }
  }, [editingWebhook, fetchWebhooks]);

  const handleDelete = useCallback(async (webhook: Webhook) => {
    if (!confirm(`Are you sure you want to delete webhook "${webhook.name}"?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete webhook');
      }

      await fetchWebhooks();
      alert(`Webhook "${webhook.name}" deleted successfully.`);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchWebhooks]);

  const handleToggle = useCallback(async (webhook: Webhook) => {
    try {
      setError(null);
      const response = await fetch(`/api/webhooks/${webhook.id}/enable`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ enabled: !webhook.enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update webhook');
      }

      await fetchWebhooks();
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [fetchWebhooks]);

  const handleEdit = useCallback((webhook: Webhook) => {
    setEditingWebhook(webhook);
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingWebhook(null);
    setShowModal(true);
  }, []);

  if (loading && webhooks.length === 0) {
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
            margin: `0 0 ${theme.spacing.lg} 0`,
            color: asciiColors.foreground,
            textTransform: "uppercase",
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            WEBHOOKS & NOTIFICATIONS
          </h1>
          <AsciiPanel title="LOADING">
            <div style={{
              padding: theme.spacing.xl,
              textAlign: "center",
              fontSize: 12,
              fontFamily: 'Consolas',
              color: asciiColors.muted
            }}>
              {ascii.blockFull} Loading webhooks...
            </div>
          </AsciiPanel>
        </div>
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
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          borderBottom: `2px solid ${asciiColors.accent}`
        }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: asciiColors.foreground,
            textTransform: "uppercase",
            fontFamily: 'Consolas'
          }}>
            <span style={{ color: asciiColors.accent, marginRight: theme.spacing.sm }}>{ascii.blockFull}</span>
            WEBHOOKS & ALERTS
          </h1>
          <div style={{ display: "flex", gap: theme.spacing.sm, alignItems: "center" }}>
          {activeTab === 'webhooks' && (
            <>
              <AsciiButton
                label="Webhooks Info"
                onClick={() => setShowWebhooksPlaybook(true)}
                variant="ghost"
              />
              <AsciiButton
                label="Add Webhook"
                onClick={handleAdd}
                variant="primary"
              />
            </>
          )}
        </div>
      </div>

        <div style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
          borderBottom: `2px solid ${asciiColors.border}`
        }}>
          <button
            onClick={() => setActiveTab('webhooks')}
            aria-label="Webhooks tab"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('webhooks');
              }
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              border: activeTab === 'webhooks' ? `2px solid ${asciiColors.accent}` : `1px solid ${asciiColors.border}`,
              background: activeTab === 'webhooks' ? asciiColors.backgroundSoft : 'transparent',
              color: activeTab === 'webhooks' ? asciiColors.foreground : asciiColors.muted,
              fontFamily: 'Consolas',
              fontSize: 12,
              fontWeight: activeTab === 'webhooks' ? 600 : 400,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              outline: 'none',
              outlineOffset: 0,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}
            onMouseDown={(e) => {
              // Prevenir outline cuando se hace click
              e.currentTarget.style.outline = 'none';
            }}
            onFocus={(e) => {
              // Solo mostrar outline si no está activo
              if (activeTab !== 'webhooks') {
                e.currentTarget.style.outline = `2px solid ${asciiColors.accent}`;
                e.currentTarget.style.outlineOffset = '2px';
              } else {
                // Asegurar que no hay outline si está activo
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = 0;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = 0;
            }}
          >
            {activeTab === 'webhooks' && (
              <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.arrowRight}</span>
            )}
            Webhooks ({webhooks.length})
          </button>
          <button
            onClick={() => setActiveTab('alert-rules')}
            aria-label="Alert Rules tab"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTab('alert-rules');
              }
            }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              border: activeTab === 'alert-rules' ? `2px solid ${asciiColors.accent}` : `1px solid ${asciiColors.border}`,
              background: activeTab === 'alert-rules' ? asciiColors.backgroundSoft : 'transparent',
              color: activeTab === 'alert-rules' ? asciiColors.foreground : asciiColors.muted,
              fontFamily: 'Consolas',
              fontSize: 12,
              fontWeight: activeTab === 'alert-rules' ? 600 : 400,
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              outline: 'none',
              outlineOffset: 0,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}
            onMouseDown={(e) => {
              // Prevenir outline cuando se hace click
              e.currentTarget.style.outline = 'none';
            }}
            onFocus={(e) => {
              // Solo mostrar outline si no está activo
              if (activeTab !== 'alert-rules') {
                e.currentTarget.style.outline = `2px solid ${asciiColors.accent}`;
                e.currentTarget.style.outlineOffset = '2px';
              } else {
                // Asegurar que no hay outline si está activo
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = 0;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.outlineOffset = 0;
            }}
          >
            {activeTab === 'alert-rules' && (
              <span style={{ color: asciiColors.accent, fontSize: 10 }}>{ascii.arrowRight}</span>
            )}
            Alert Rules
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: theme.spacing.lg }}>
            <AsciiPanel title="ERROR">
              <div style={{ 
                color: asciiColors.foreground, 
                padding: theme.spacing.md,
                fontFamily: 'Consolas',
                fontSize: 12,
                background: asciiColors.backgroundSoft,
                borderRadius: 2,
                border: `2px solid ${asciiColors.foreground}`
              }}>
                {error}
              </div>
            </AsciiPanel>
          </div>
        )}

      {showWebhooksPlaybook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowWebhooksPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="WEBHOOKS & NOTIFICATIONS PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    Webhooks & Notifications enable real-time alerts and integrations with external systems. 
                    Configure webhooks to receive notifications about system events, log entries, errors, and 
                    important data operations. Webhooks can be sent to HTTP endpoints, Slack, Microsoft Teams, 
                    Telegram, or email addresses.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} WEBHOOK TYPES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.foreground, marginBottom: 4 }}>
                        HTTP
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Send POST requests to any HTTP/HTTPS endpoint. Ideal for custom integrations, APIs, or 
                        web services. Requires a valid URL endpoint that accepts JSON payloads.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        SLACK
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11, fontFamily: 'Consolas' }}>
                        Send notifications to Slack channels via Incoming Webhooks. Requires a Slack webhook URL 
                        from your Slack workspace. Messages are formatted for Slack's rich message format.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        TEAMS
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11, fontFamily: 'Consolas' }}>
                        Send notifications to Microsoft Teams channels via webhook connectors. Requires a Teams 
                        webhook URL from your Teams channel connector settings.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        TELEGRAM
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11, fontFamily: 'Consolas' }}>
                        Send notifications to Telegram chats or channels. Requires a bot token (from @BotFather) 
                        and a chat ID (channel or user ID). Supports both private chats and public channels.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: asciiColors.accent, marginBottom: 4 }}>
                        EMAIL
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Send email notifications to specified email addresses. Requires a valid email address. 
                        Email notifications are sent as plain text or HTML depending on system configuration.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} LOG LEVELS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.foreground, fontWeight: 600, fontFamily: 'Consolas' }}>ERROR</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Critical errors that require immediate attention
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>WARNING</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Warnings about potential issues or unexpected conditions
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600, fontFamily: 'Consolas' }}>INFO</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Informational messages about system operations
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>DEBUG</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Detailed debugging information for troubleshooting
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} LOG CATEGORIES
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.foreground, fontSize: 11 }}>
                        Filter notifications by log category (e.g., GOVERNANCE, SYNC, CATALOG, etc.). 
                        When no categories are selected, all categories are included. Select specific 
                        categories to receive notifications only for relevant system components.
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} WEBHOOK STATUS
                  </div>
                  
                  <div style={{ marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600, fontFamily: 'Consolas' }}>ENABLED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Webhook is active and will receive notifications based on configured filters
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600, fontFamily: 'Consolas' }}>DISABLED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11, fontFamily: 'Consolas' }}>
                        Webhook is temporarily disabled and will not receive notifications
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: asciiColors.backgroundSoft, 
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground }}>
                    • Use specific log levels and categories to avoid notification fatigue<br/>
                    • Test webhook endpoints before enabling in production<br/>
                    • Monitor webhook delivery success rates<br/>
                    • Use different webhooks for different severity levels<br/>
                    • Secure webhook URLs and API keys appropriately<br/>
                    • Enable webhooks only for critical events in high-volume systems
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowWebhooksPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <>
          {webhooks.length === 0 ? (
            <AsciiPanel title="NO WEBHOOKS">
              <div style={{
                padding: theme.spacing.xl,
                textAlign: "center",
                fontSize: 12,
                fontFamily: 'Consolas',
                color: asciiColors.muted
              }}>
                {ascii.blockEmpty} No webhooks configured
                <br />
                <br />
                <AsciiButton
                  label="Create First Webhook"
                  onClick={handleAdd}
                  variant="primary"
                />
              </div>
            </AsciiPanel>
          ) : (
            <WebhooksTreeView
              webhooks={webhooks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          )}
        </>
      )}

      {activeTab === 'alert-rules' && <AlertRules />}

        <WebhookModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingWebhook(null);
          }}
          onSave={handleSave}
          initialData={editingWebhook}
        />
      </div>
    </Container>
  );
};

export default Webhooks;

