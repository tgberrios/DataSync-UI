import React, { useState } from 'react';
import { FormGroup, Label, Input, Button } from './BaseComponents';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface FTPConnectionConfigProps {
  config: {
    protocol: 'FTP' | 'SFTP';
    host: string;
    port: number;
    username: string;
    password: string;
    remote_path: string;
    use_passive?: boolean;
    use_ssl?: boolean;
  };
  onChange: (config: FTPConnectionConfigProps['config']) => void;
  onTest?: () => void;
  isTesting?: boolean;
}

export const FTPConnectionConfig: React.FC<FTPConnectionConfigProps> = ({
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
          onChange={(e) => handleChange('protocol', e.target.value as 'FTP' | 'SFTP')}
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
          <option value="FTP">FTP</option>
          <option value="SFTP">SFTP</option>
        </select>
      </FormGroup>

      <FormGroup>
        <Label>Host</Label>
        <Input
          type="text"
          value={config.host}
          onChange={(e) => handleChange('host', e.target.value)}
          placeholder="ftp.example.com"
        />
      </FormGroup>

      <FormGroup>
        <Label>Port</Label>
        <Input
          type="number"
          value={config.port}
          onChange={(e) => handleChange('port', parseInt(e.target.value) || 21)}
          placeholder={config.protocol === 'FTP' ? '21' : '22'}
        />
      </FormGroup>

      <FormGroup>
        <Label>Username</Label>
        <Input
          type="text"
          value={config.username}
          onChange={(e) => handleChange('username', e.target.value)}
          placeholder="username"
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

      <FormGroup>
        <Label>Remote Path</Label>
        <Input
          type="text"
          value={config.remote_path}
          onChange={(e) => handleChange('remote_path', e.target.value)}
          placeholder="/path/to/files"
        />
      </FormGroup>

      {config.protocol === 'FTP' && (
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
              checked={config.use_passive !== false}
              onChange={(e) => handleChange('use_passive', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Use Passive Mode
          </label>
        </FormGroup>
      )}

      {config.protocol === 'SFTP' && (
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
      )}

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
