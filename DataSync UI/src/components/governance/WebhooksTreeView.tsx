import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

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

interface TypeNode {
  type: string;
  webhooks: Webhook[];
}

interface WebhooksTreeViewProps {
  webhooks: Webhook[];
  onEdit?: (webhook: Webhook) => void;
  onDelete?: (webhook: Webhook) => void;
  onToggle?: (webhook: Webhook) => void;
}

const WebhooksTreeView: React.FC<WebhooksTreeViewProps> = ({ 
  webhooks, 
  onEdit,
  onDelete,
  onToggle
}) => {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const types = new Map<string, TypeNode>();

    webhooks.forEach(webhook => {
      const type = webhook.webhook_type || 'OTHER';

      if (!types.has(type)) {
        types.set(type, {
          type,
          webhooks: []
        });
      }

      types.get(type)!.webhooks.push(webhook);
    });

    return Array.from(types.values()).sort((a, b) => a.type.localeCompare(b.type));
  }, [webhooks]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push(`${ascii.v}  `);
    }
    
    if (isLast) {
      lines.push(`${ascii.bl}${ascii.h}${ascii.h} `);
    } else {
      lines.push(`${ascii.tRight}${ascii.h}${ascii.h} `);
    }
    
    return <span style={{ 
      color: asciiColors.border, 
      marginRight: 6, 
      fontFamily: "Consolas", 
      fontSize: 11 
    }}>{lines.join('')}</span>;
  };

  if (webhooks.length === 0) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        textAlign: 'center',
        color: asciiColors.muted,
        fontFamily: 'Consolas',
        fontSize: 12
      }}>
        {ascii.blockEmpty} No webhooks configured
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground
    }}>
      {treeData.map((typeNode, typeIdx) => {
        const isTypeExpanded = expandedTypes.has(typeNode.type);
        const isTypeLast = typeIdx === treeData.length - 1;

        return (
          <div key={typeNode.type} style={{ marginBottom: 4 }}>
            {/* Type Level */}
            <div
              onClick={() => toggleType(typeNode.type)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 8px",
                cursor: "pointer",
                borderLeft: `2px solid ${asciiColors.accent}`,
                backgroundColor: isTypeExpanded ? asciiColors.backgroundSoft : asciiColors.background,
                transition: "all 0.15s ease",
                marginBottom: 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                if (!isTypeExpanded) {
                  e.currentTarget.style.backgroundColor = asciiColors.background;
                }
              }}
            >
              <span style={{
                marginRight: 8,
                color: isTypeExpanded ? asciiColors.accent : asciiColors.muted,
                fontSize: 10,
                transition: "transform 0.15s ease",
                display: "inline-block",
                transform: isTypeExpanded ? "rotate(90deg)" : "rotate(0deg)"
              }}>
                {ascii.arrowRight}
              </span>
              <span style={{
                fontWeight: 600,
                color: asciiColors.accent,
                fontSize: 12,
                flex: 1
              }}>
                {typeNode.type}
              </span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 500,
                border: `1px solid ${asciiColors.border}`,
                backgroundColor: asciiColors.backgroundSoft,
                color: asciiColors.foreground
              }}>
                {typeNode.webhooks.length}
              </span>
            </div>

            {isTypeExpanded && (
              <div style={{ paddingLeft: 24 }}>
                {typeNode.webhooks.map((webhook, webhookIdx) => {
                  const isWebhookLast = webhookIdx === typeNode.webhooks.length - 1;

                  return (
                    <div
                      key={webhook.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        padding: "10px 8px",
                        marginLeft: 8,
                        marginBottom: 2,
                        borderLeft: `1px solid ${asciiColors.border}`,
                        backgroundColor: "transparent",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                        e.currentTarget.style.borderLeftColor = asciiColors.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderLeftColor = asciiColors.border;
                      }}
                    >
                      {renderTreeLine(1, isWebhookLast)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{
                            fontWeight: 600,
                            color: asciiColors.foreground,
                            fontSize: 11
                          }}>
                            {webhook.name}
                          </span>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 500,
                            border: `1px solid ${webhook.enabled ? asciiColors.accent : asciiColors.muted}`,
                            color: webhook.enabled ? asciiColors.accent : asciiColors.muted,
                            backgroundColor: "transparent"
                          }}>
                            {webhook.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                        {webhook.url && (
                          <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            URL: {webhook.url.length > 50 ? webhook.url.substring(0, 50) + '...' : webhook.url}
                          </div>
                        )}
                        {webhook.email_address && (
                          <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4, fontFamily: 'Consolas' }}>
                            Email: {webhook.email_address}
                          </div>
                        )}
                        {webhook.log_levels && webhook.log_levels.length > 0 && (
                          <div style={{ fontSize: 10, color: asciiColors.muted, marginBottom: 4 }}>
                            Levels: {webhook.log_levels.map((level, idx) => (
                              <span key={idx} style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                margin: '0 4px',
                                background: asciiColors.backgroundSoft,
                                color: asciiColors.foreground,
                                border: `1px solid ${asciiColors.border}`,
                                borderRadius: 2,
                                fontSize: 9,
                                fontFamily: 'Consolas'
                              }}>
                                {level}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: asciiColors.muted, fontFamily: 'Consolas' }}>
                          Created: {format(new Date(webhook.created_at), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
                        <AsciiButton
                          label={webhook.enabled ? "Disable" : "Enable"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle?.(webhook);
                          }}
                          variant="ghost"
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        />
                        <AsciiButton
                          label="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(webhook);
                          }}
                          variant="ghost"
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        />
                        <AsciiButton
                          label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(webhook);
                          }}
                          variant="ghost"
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WebhooksTreeView;
