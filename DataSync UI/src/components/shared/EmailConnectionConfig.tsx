import React, { useState } from 'react';
import { FormGroup, Label, Input, Button } from './BaseComponents';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface EmailConnectionConfigProps {
  config: {
    protocol: 'IMAP' | 'POP3';
    server: string;
    port: number;
    username: string;
    password: string;
    folder: string;
    use_ssl?: boolean;
    max_emails?: number;
    download_attachments?: boolean;
  };
  onChange: (config: EmailConnectionConfigProps['config']) => void;
  onTest?: () => void;
  isTesting?: boolean;
}

export const EmailConnectionConfig: React.FC<EmailConnectionConfigProps> = ({
  config,
  onChange,
  onTest,
  isTesting = false
}) => {
  const handleChange = (field: keyof typeof config, value: string | number | boolean) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div style={{ padding: theme.spacing.md }}>
      <FormGroup>
        <Label>Protocol</Label>
        <select
          value={config.protocol}
          onChange={(e) => handleChange('protocol', e.target.value as 'IMAP' | 'POP3')}
          style={{
            width: '100%',
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            fontFamily: 'Consolas',
            fontSize: 12,
            backgroundColor: asciiColors.background,
            color: asciiColors.foreground,
            cursor: 'pointer'
          }}
        >
          <option value="IMAP">IMAP</option>
          <option value="POP3">POP3</option>
        </select>
      </FormGroup>

      <FormGroup>
        <Label>Server</Label>
        <Input
          type="text"
          value={config.server}
          onChange={(e) => handleChange('server', e.target.value)}
          placeholder="imap.example.com"
        />
      </FormGroup>

      <FormGroup>
        <Label>Port</Label>
        <Input
          type="number"
          value={config.port}
          onChange={(e) => handleChange('port', parseInt(e.target.value) || 993)}
          placeholder={config.protocol === 'IMAP' ? '993' : '110'}
        />
      </FormGroup>

      <FormGroup>
        <Label>Username</Label>
        <Input
          type="text"
          value={config.username}
          onChange={(e) => handleChange('username', e.target.value)}
          placeholder="user@example.com"
        />
      </FormGroup>

      <FormGroup>
        <Label>Password</Label>
        <Input
          type="password"
          value={config.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="password"
        />
      </FormGroup>

      {config.protocol === 'IMAP' && (
        <FormGroup>
          <Label>Folder</Label>
          <Input
            type="text"
            value={config.folder}
            onChange={(e) => handleChange('folder', e.target.value)}
            placeholder="INBOX"
          />
        </FormGroup>
      )}

      <FormGroup>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          fontFamily: 'Consolas',
          fontSize: 12,
          color: asciiColors.foreground,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={config.use_ssl !== false}
            onChange={(e) => handleChange('use_ssl', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Use SSL
        </label>
      </FormGroup>

      <FormGroup>
        <Label>Max Emails</Label>
        <Input
          type="number"
          value={config.max_emails || 100}
          onChange={(e) => handleChange('max_emails', parseInt(e.target.value) || 100)}
          placeholder="100"
        />
      </FormGroup>

      <FormGroup>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.xs,
          fontFamily: 'Consolas',
          fontSize: 12,
          color: asciiColors.foreground,
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={config.download_attachments || false}
            onChange={(e) => handleChange('download_attachments', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Download Attachments
        </label>
      </FormGroup>

      {onTest && (
        <Button
          onClick={onTest}
          disabled={isTesting}
          style={{ marginTop: theme.spacing.md }}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
      )}
    </div>
  );
};
