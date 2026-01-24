import React, { useState } from 'react';
import { FormGroup, Label, Input, Button } from './BaseComponents';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

interface S3ConnectionConfigProps {
  config: {
    access_key_id: string;
    secret_access_key: string;
    region: string;
    bucket_name: string;
    endpoint?: string;
    use_ssl?: boolean;
  };
  onChange: (config: S3ConnectionConfigProps['config']) => void;
  onTest?: () => void;
  isTesting?: boolean;
}

export const S3ConnectionConfig: React.FC<S3ConnectionConfigProps> = ({
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
        <Label>Access Key ID</Label>
        <Input
          type="text"
          value={config.access_key_id}
          onChange={(e) => handleChange('access_key_id', e.target.value)}
          placeholder="AKIAIOSFODNN7EXAMPLE"
        />
      </FormGroup>

      <FormGroup>
        <Label>Secret Access Key</Label>
        <Input
          type="password"
          value={config.secret_access_key}
          onChange={(e) => handleChange('secret_access_key', e.target.value)}
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        />
      </FormGroup>

      <FormGroup>
        <Label>Region</Label>
        <Input
          type="text"
          value={config.region}
          onChange={(e) => handleChange('region', e.target.value)}
          placeholder="us-east-1"
        />
      </FormGroup>

      <FormGroup>
        <Label>Bucket Name</Label>
        <Input
          type="text"
          value={config.bucket_name}
          onChange={(e) => handleChange('bucket_name', e.target.value)}
          placeholder="my-bucket"
        />
      </FormGroup>

      <FormGroup>
        <Label>Endpoint (Optional)</Label>
        <Input
          type="text"
          value={config.endpoint || ''}
          onChange={(e) => handleChange('endpoint', e.target.value)}
          placeholder="s3.amazonaws.com"
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
            checked={config.use_ssl !== false}
            onChange={(e) => handleChange('use_ssl', e.target.checked)}
            style={{
              cursor: 'pointer'
            }}
          />
          Use SSL
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
