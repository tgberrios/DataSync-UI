import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Button,
  Input,
  FormGroup,
  Label,
  Select,
} from '../shared/BaseComponents';
import { theme } from '../../theme/theme';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const BlurOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(5px);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  animation: ${fadeIn} 0.15s ease-in;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.15s ease-in;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.main};
  padding: ${theme.spacing.xxl};
  border-radius: ${theme.borderRadius.lg};
  min-width: 600px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  font-family: ${theme.fonts.primary};
  box-shadow: ${theme.shadows.lg};
  animation: ${slideUp} 0.2s ease-out;
  border: 1px solid ${theme.colors.border.light};
`;

const ModalHeader = styled.div`
  border-bottom: 2px solid ${theme.colors.border.dark};
  padding-bottom: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
  font-size: 1.2em;
  font-weight: bold;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, ${theme.colors.primary.main}, ${theme.colors.primary.dark});
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.xs};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  cursor: pointer;
  font-size: 14px;
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const HelpText = styled.div`
  font-size: 12px;
  color: ${theme.colors.text.secondary};
  margin-top: 4px;
  padding: 8px;
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.primary.main};
`;

const HelpSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border.light};
`;

const HelpTitle = styled.div`
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.primary.main};
`;

const HelpList = styled.ul`
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  line-height: 1.6;
`;

const HelpListItem = styled.li`
  margin-bottom: 4px;
`;

interface WebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhook: any) => Promise<void>;
  initialData?: any;
}

export const WebhookModal = ({ isOpen, onClose, onSave, initialData }: WebhookModalProps) => {
  const [name, setName] = useState('');
  const [webhookType, setWebhookType] = useState('HTTP');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [logLevels, setLogLevels] = useState<string[]>([]);
  const [logCategories, setLogCategories] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const allLogLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

  const allLogCategories = [
    'SYSTEM',
    'DATABASE',
    'TRANSFER',
    'CUSTOM_JOB',
    'API',
    'QUALITY',
    'GOVERNANCE'
  ];

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setWebhookType(initialData.webhook_type || 'HTTP');
      setUrl(initialData.url || '');
      setApiKey(initialData.api_key || '');
      setBotToken(initialData.bot_token || '');
      setChatId(initialData.chat_id || '');
      setEmailAddress(initialData.email_address || '');
      setLogLevels(Array.isArray(initialData.log_levels) ? initialData.log_levels : []);
      setLogCategories(Array.isArray(initialData.log_categories) ? initialData.log_categories : []);
      setEnabled(initialData.enabled !== undefined ? initialData.enabled : true);
    } else {
      setName('');
      setWebhookType('HTTP');
      setUrl('');
      setApiKey('');
      setBotToken('');
      setChatId('');
      setEmailAddress('');
      setLogLevels([]);
      setLogCategories([]);
      setEnabled(true);
    }
  }, [initialData, isOpen]);

  const handleLogLevelToggle = (level: string) => {
    setLogLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleLogCategoryToggle = (category: string) => {
    setLogCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        name,
        webhook_type: webhookType,
        url: (webhookType !== 'EMAIL' && webhookType !== 'TELEGRAM') ? url : undefined,
        api_key: apiKey || undefined,
        bot_token: webhookType === 'TELEGRAM' ? botToken : undefined,
        chat_id: webhookType === 'TELEGRAM' ? chatId : undefined,
        email_address: webhookType === 'EMAIL' ? emailAddress : undefined,
        log_levels: logLevels,
        log_categories: logCategories,
        enabled
      });
      onClose();
    } catch (error) {
      console.error('Error saving webhook:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <BlurOverlay onClick={onClose} />
      <ModalOverlay>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            {initialData ? 'Edit Webhook' : 'Add Webhook'}
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My Webhook"
              />
            </FormGroup>

            <FormGroup>
              <Label>Webhook Type *</Label>
              <Select
                value={webhookType}
                onChange={(e) => setWebhookType(e.target.value)}
                required
              >
                <option value="HTTP">HTTP Webhook</option>
                <option value="SLACK">Slack</option>
                <option value="TEAMS">Microsoft Teams</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="EMAIL">Email</option>
              </Select>
              <HelpText>
                Select the notification channel. Telegram is recommended for real-time alerts.
              </HelpText>
            </FormGroup>

            {webhookType !== 'EMAIL' && webhookType !== 'TELEGRAM' && (
              <FormGroup>
                <Label>URL *</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required={webhookType !== 'EMAIL' && webhookType !== 'TELEGRAM'}
                  placeholder={
                    webhookType === 'SLACK'
                      ? 'https://hooks.slack.com/services/...'
                      : webhookType === 'TEAMS'
                      ? 'https://outlook.office.com/webhook/...'
                      : 'https://example.com/webhook'
                  }
                />
                {webhookType === 'SLACK' && (
                  <HelpText>
                    Get your webhook URL from: Slack App → Incoming Webhooks → Add New Webhook
                  </HelpText>
                )}
                {webhookType === 'TEAMS' && (
                  <HelpText>
                    Get your webhook URL from: Teams Channel → Connectors → Incoming Webhook
                  </HelpText>
                )}
              </FormGroup>
            )}

            {webhookType === 'TELEGRAM' && (
              <>
                <HelpSection>
                  <HelpTitle>📱 Telegram Setup Guide</HelpTitle>
                  <HelpList>
                    <HelpListItem>1. Open Telegram and search for @BotFather</HelpListItem>
                    <HelpListItem>2. Send /newbot and follow instructions</HelpListItem>
                    <HelpListItem>3. Copy the bot token (format: 123456789:ABCdef...)</HelpListItem>
                    <HelpListItem>4. Add your bot as admin to your channel</HelpListItem>
                    <HelpListItem>5. For public channels: use @channelname (with @)</HelpListItem>
                    <HelpListItem>6. For private channels: get Chat ID from @userinfobot</HelpListItem>
                  </HelpList>
                </HelpSection>
                <FormGroup>
                  <Label>Bot Token *</Label>
                  <Input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    required
                    placeholder="8509149857:AAFdtO2jEB0otxj5h50Z-v9NMvtnPsWFPoY"
                  />
                  <HelpText>
                    Format: numbers:letters (e.g., 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)
                    <br />
                    Get this from @BotFather after creating your bot
                  </HelpText>
                </FormGroup>
                <FormGroup>
                  <Label>Chat ID *</Label>
                  <Input
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    required
                    placeholder="@something45436 or -1001234567890"
                  />
                  <HelpText>
                    For public channels: Use @channelname (e.g., @something45436)
                    <br />
                    For private channels: Use numeric ID (e.g., -1001234567890)
                    <br />
                    Get Chat ID by adding @userinfobot to your channel
                  </HelpText>
                </FormGroup>
              </>
            )}

            {webhookType === 'EMAIL' && (
              <FormGroup>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  required
                  placeholder="alerts@example.com"
                />
              </FormGroup>
            )}

            {(webhookType === 'HTTP' || webhookType === 'SLACK' || webhookType === 'TEAMS') && (
              <FormGroup>
                <Label>API Key (Optional)</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer token or API key"
                />
                <HelpText>
                  Optional authentication header. Format: Bearer token or API key
                </HelpText>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Log Levels (Leave empty for all) *</Label>
              <CheckboxGroup>
                {allLogLevels.map(level => (
                  <CheckboxLabel key={level}>
                    <Checkbox
                      type="checkbox"
                      checked={logLevels.includes(level)}
                      onChange={() => handleLogLevelToggle(level)}
                    />
                    {level}
                  </CheckboxLabel>
                ))}
              </CheckboxGroup>
              <HelpText>
                Select which log levels to receive. Leave all unchecked to receive all levels.
                Recommended: ERROR, CRITICAL, WARNING
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label>Log Categories (Leave empty for all) *</Label>
              <CheckboxGroup>
                {allLogCategories.map(category => (
                  <CheckboxLabel key={category}>
                    <Checkbox
                      type="checkbox"
                      checked={logCategories.includes(category)}
                      onChange={() => handleLogCategoryToggle(category)}
                    />
                    {category.replace(/_/g, ' ')}
                  </CheckboxLabel>
                ))}
              </CheckboxGroup>
              <HelpText>
                Select which log categories to receive. Leave all unchecked to receive all categories.
                Recommended: TRANSFER, SYSTEM, ERROR
              </HelpText>
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enabled
              </CheckboxLabel>
            </FormGroup>

            <ButtonGroup>
              <Button type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name}>
                {loading ? 'Saving...' : initialData ? 'Update' : 'Create'}
              </Button>
            </ButtonGroup>
          </form>
        </ModalContent>
      </ModalOverlay>
    </>
  );
};

