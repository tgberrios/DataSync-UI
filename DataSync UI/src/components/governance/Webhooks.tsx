import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { WebhookModal } from './WebhookModal';
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
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
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
          WEBHOOKS & NOTIFICATIONS
        </h1>
        <AsciiButton onClick={handleAdd}>
          {ascii.blockFull} ADD WEBHOOK
        </AsciiButton>
      </div>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ color: asciiColors.danger, padding: "10px" }}>
            {error}
          </div>
        </AsciiPanel>
      )}

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
            <AsciiButton onClick={handleAdd}>
              {ascii.blockFull} CREATE FIRST WEBHOOK
            </AsciiButton>
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
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: asciiColors.accent }}>Type:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>{webhook.webhook_type}</span>
                    </div>
                    {webhook.url && (
                      <div style={{ marginBottom: "5px" }}>
                        <span style={{ color: asciiColors.accent }}>URL:</span>{' '}
                        <span style={{ color: asciiColors.muted, fontSize: 11 }}>
                          {webhook.url.length > 60 ? webhook.url.substring(0, 60) + '...' : webhook.url}
                        </span>
                      </div>
                    )}
                    {webhook.email_address && (
                      <div style={{ marginBottom: "5px" }}>
                        <span style={{ color: asciiColors.accent }}>Email:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{webhook.email_address}</span>
                      </div>
                    )}
                    {webhook.chat_id && (
                      <div style={{ marginBottom: "5px" }}>
                        <span style={{ color: asciiColors.accent }}>Chat ID:</span>{' '}
                        <span style={{ color: asciiColors.foreground }}>{webhook.chat_id}</span>
                      </div>
                    )}
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: asciiColors.accent }}>Log Levels:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>
                        {webhook.log_levels && webhook.log_levels.length > 0 
                          ? webhook.log_levels.join(', ')
                          : 'All'}
                      </span>
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: asciiColors.accent }}>Log Categories:</span>{' '}
                      <span style={{ color: asciiColors.foreground }}>
                        {webhook.log_categories && webhook.log_categories.length > 0 
                          ? webhook.log_categories.join(', ')
                          : 'All'}
                      </span>
                    </div>
                    <div style={{ marginBottom: "5px" }}>
                      <span style={{ color: asciiColors.accent }}>Status:</span>{' '}
                      <span style={{
                        color: webhook.enabled ? asciiColors.success : asciiColors.muted
                      }}>
                        {webhook.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ marginTop: "10px", fontSize: 11, color: asciiColors.muted }}>
                      Created: {format(new Date(webhook.created_at), 'yyyy-MM-dd HH:mm')}
                      {webhook.updated_at !== webhook.created_at && (
                        <> | Updated: {format(new Date(webhook.updated_at), 'yyyy-MM-dd HH:mm')}</>
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
                      onClick={() => handleToggle(webhook)}
                      style={{
                        fontSize: 10,
                        padding: "5px 10px"
                      }}
                    >
                      {webhook.enabled ? ascii.blockEmpty + ' DISABLE' : ascii.blockFull + ' ENABLE'}
                    </AsciiButton>
                    <AsciiButton
                      onClick={() => handleEdit(webhook)}
                      style={{
                        fontSize: 10,
                        padding: "5px 10px"
                      }}
                    >
                      {ascii.blockFull} EDIT
                    </AsciiButton>
                    <AsciiButton
                      onClick={() => handleDelete(webhook)}
                      style={{
                        fontSize: 10,
                        padding: "5px 10px",
                        color: asciiColors.danger
                      }}
                    >
                      {ascii.blockFull} DELETE
                    </AsciiButton>
                  </div>
                </div>
              </div>
            </AsciiPanel>
          ))}
        </div>
      )}

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

