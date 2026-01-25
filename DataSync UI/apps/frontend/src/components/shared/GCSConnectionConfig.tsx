import React from 'react';
import { FormGroup, Label, Input, Button } from './BaseComponents';
import styled from 'styled-components';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

const Textarea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid ${asciiColors.border};
  border-radius: 2;
  font-family: 'Consolas', monospace;
  background: ${asciiColors.background};
  color: ${asciiColors.foreground};
  font-size: 12px;
  width: 100%;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${asciiColors.accent};
    box-shadow: 0 0 0 2px ${asciiColors.accentLight};
  }
`;

interface GCSConnectionConfigProps {
  config: {
    project_id: string;
    credentials_json: string;
    bucket_name: string;
    use_https?: boolean;
  };
  onChange: (config: GCSConnectionConfigProps['config']) => void;
  onTest?: () => void;
  isTesting?: boolean;
}

export const GCSConnectionConfig: React.FC<GCSConnectionConfigProps> = ({
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
        <Label>Project ID</Label>
        <Input
          type="text"
          value={config.project_id}
          onChange={(e) => handleChange('project_id', e.target.value)}
          placeholder="my-project-id"
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
        <Label>Credentials JSON</Label>
        <Textarea
          value={config.credentials_json}
          onChange={(e) => handleChange('credentials_json', e.target.value)}
          placeholder='{"type": "service_account", ...}'
          rows={8}
          style={{
            fontFamily: 'Consolas',
            fontSize: 11
          }}
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
