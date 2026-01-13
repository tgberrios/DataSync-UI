import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { WebhookModal } from './WebhookModal';
import AlertRules from './AlertRules';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
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
    const interval = setInterval(() => {
      if (isMountedRef.current && !showModal) {
        fetchWebhooks();
      }
    }, 30000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchWebhooks, showModal]);

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
      <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: "0 0 20px 0",
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          WEBHOOKS & NOTIFICATIONS
        </h1>
        <AsciiPanel title="LOADING">
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontSize: 12,
            fontFamily: "Consolas",
            color: asciiColors.muted
          }}>
            {ascii.blockFull} Loading webhooks...
          </div>
        </AsciiPanel>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Consolas", fontSize: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h1 style={{
          fontSize: 14,
          fontWeight: 600,
          margin: 0,
          color: asciiColors.foreground,
          textTransform: "uppercase",
          fontFamily: "Consolas"
        }}>
          <span style={{ color: asciiColors.accent, marginRight: 8 }}>{ascii.blockFull}</span>
          WEBHOOKS & ALERTS
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
        gap: 8,
        marginBottom: 20,
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'webhooks' ? `3px solid ${asciiColors.accent}` : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'webhooks' ? asciiColors.accent : asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12,
            fontWeight: activeTab === 'webhooks' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Webhooks ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveTab('alert-rules')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'alert-rules' ? `3px solid ${asciiColors.warning}` : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'alert-rules' ? asciiColors.warning : asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12,
            fontWeight: activeTab === 'alert-rules' ? 'bold' : 'normal',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Alert Rules
        </button>
      </div>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ color: asciiColors.danger, padding: "10px" }}>
            {error}
          </div>
        </AsciiPanel>
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
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#4A154B', marginBottom: 4 }}>
                        SLACK
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Send notifications to Slack channels via Incoming Webhooks. Requires a Slack webhook URL 
                        from your Slack workspace. Messages are formatted for Slack's rich message format.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#6264A7', marginBottom: 4 }}>
                        TEAMS
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
                        Send notifications to Microsoft Teams channels via webhook connectors. Requires a Teams 
                        webhook URL from your Teams channel connector settings.
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0088cc', marginBottom: 4 }}>
                        TELEGRAM
                      </div>
                      <div style={{ color: asciiColors.foreground, marginLeft: 16, fontSize: 11 }}>
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
                      <span style={{ color: asciiColors.danger, fontWeight: 600 }}>ERROR</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Critical errors that require immediate attention
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.warning, fontWeight: 600 }}>WARNING</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Warnings about potential issues or unexpected conditions
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>INFO</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Informational messages about system operations
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>DEBUG</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
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
                      <span style={{ color: asciiColors.success, fontWeight: 600 }}>ENABLED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
                        Webhook is active and will receive notifications based on configured filters
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.muted, fontWeight: 600 }}>DISABLED</span>
                      <span style={{ color: asciiColors.foreground, marginLeft: 8, fontSize: 11 }}>
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
                padding: "40px",
                textAlign: "center",
                fontSize: 12,
                fontFamily: "Consolas",
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
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {webhooks.map(webhook => (
            <AsciiPanel key={webhook.id} title={webhook.name}>
              <div style={{ padding: "15px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "10px"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Type:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>{webhook.webhook_type}</span>
                    </div>
                    {webhook.url && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>URL:</span>{' '}
                        <span style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'monospace' }}>
                          {webhook.url.length > 70 ? webhook.url.substring(0, 70) + '...' : webhook.url}
                        </span>
                      </div>
                    )}
                    {webhook.email_address && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Email:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{webhook.email_address}</span>
                      </div>
                    )}
                    {webhook.chat_id && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Chat ID:</span>{' '}
                        <span style={{ color: asciiColors.foreground, fontFamily: 'monospace', fontSize: 11 }}>
                          {webhook.chat_id}
                        </span>
                      </div>
                    )}
                    {webhook.api_key && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>API Key:</span>{' '}
                        <span style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'monospace' }}>
                          {webhook.api_key.length > 30 ? webhook.api_key.substring(0, 30) + '...' : webhook.api_key}
                        </span>
                      </div>
                    )}
                    {webhook.bot_token && (
                      <div style={{ marginBottom: "8px" }}>
                        <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Bot Token:</span>{' '}
                        <span style={{ color: asciiColors.muted, fontSize: 11, fontFamily: 'monospace' }}>
                          {webhook.bot_token.length > 30 ? webhook.bot_token.substring(0, 30) + '...' : webhook.bot_token}
                        </span>
                      </div>
                    )}
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Log Levels:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>
                        {webhook.log_levels && webhook.log_levels.length > 0 
                          ? webhook.log_levels.map((level, idx) => (
                              <span key={idx} style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                margin: '0 2px',
                                background: level === 'ERROR' ? asciiColors.danger : 
                                           level === 'WARNING' ? asciiColors.warning :
                                           level === 'INFO' ? asciiColors.accent : asciiColors.success,
                                color: '#ffffff',
                                borderRadius: 2,
                                fontSize: 10
                              }}>
                                {level}
                              </span>
                            ))
                          : <span style={{ color: asciiColors.muted }}>All</span>}
                      </span>
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Log Categories:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>
                        {webhook.log_categories && webhook.log_categories.length > 0 
                          ? webhook.log_categories.join(', ')
                          : <span style={{ color: asciiColors.muted }}>All</span>}
                      </span>
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ color: asciiColors.accent, fontWeight: 600 }}>Status:</span>{' '}
                      <span style={{
                        color: webhook.enabled ? asciiColors.success : asciiColors.muted,
                        fontWeight: 600
                      }}>
                        {webhook.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${asciiColors.border}`, fontSize: 11, color: asciiColors.muted }}>
                      <div style={{ marginBottom: "4px" }}>
                        Created: {format(new Date(webhook.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </div>
                      {webhook.updated_at !== webhook.created_at && (
                        <div>
                          Updated: {format(new Date(webhook.updated_at), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    marginLeft: "15px"
                  }}>
                    <AsciiButton
                      label={webhook.enabled ? "Disable" : "Enable"}
                      onClick={() => handleToggle(webhook)}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Edit"
                      onClick={() => handleEdit(webhook)}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Delete"
                      onClick={() => handleDelete(webhook)}
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>
            </AsciiPanel>
              ))}
            </div>
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
  );
};

export default Webhooks;

