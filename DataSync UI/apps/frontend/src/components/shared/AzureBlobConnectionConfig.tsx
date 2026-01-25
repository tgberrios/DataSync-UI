import React from 'react';
import { FormGroup, Label, Input, Button } from './BaseComponents';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface AzureBlobConnectionConfigProps {
  config: {
    account_name: string;
    account_key: string;
    container_name: string;
    endpoint_suffix?: string;
    use_https?: boolean;
  };
  onChange: (config: AzureBlobConnectionConfigProps['config']) => void;
  onTest?: () => void;
  isTesting?: boolean;
}

export const AzureBlobConnectionConfig: React.FC<AzureBlobConnectionConfigProps> = ({
  config,
  onChange,
  onTest,
  isTesting = false
}) => {
  const handleChange = (field: keyof typeof config, value: string | boolean) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  return (
    <div style={{ padding: theme.spacing.md }}>
      <FormGroup>
        <Label>Account Name</Label>
        <Input
          type="text"
          value={config.account_name || ''}
          onChange={(e) => handleChange('account_name', e.target.value)}
          placeholder="mystorageaccount"
        />
      </FormGroup>

      <FormGroup>
        <Label>Account Key</Label>
        <Input
          type="password"
          value={config.account_key || ''}
          onChange={(e) => handleChange('account_key', e.target.value)}
          placeholder="account-key"
        />
      </FormGroup>

      <FormGroup>
        <Label>Container Name</Label>
        <Input
          type="text"
          value={config.container_name || ''}
          onChange={(e) => handleChange('container_name', e.target.value)}
          placeholder="my-container"
        />
      </FormGroup>

      <FormGroup>
        <Label>Endpoint Suffix</Label>
        <Input
          type="text"
          value={config.endpoint_suffix || 'core.windows.net'}
          onChange={(e) => handleChange('endpoint_suffix', e.target.value)}
          placeholder="core.windows.net"
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
            checked={config.use_https !== false}
            onChange={(e) => handleChange('use_https', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Use HTTPS
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
