import React, { useState, useEffect, useRef } from 'react';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';

const APIDocumentation: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Load Swagger UI in iframe
    if (iframeRef.current) {
      iframeRef.current.src = '/api-docs';
    }
  }, []);

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: theme.spacing.md }}>API Documentation (Swagger/OpenAPI)</h3>

      <div style={{
        border: `1px solid ${asciiColors.border}`,
        borderRadius: 2,
        backgroundColor: asciiColors.background,
        minHeight: '600px',
        overflow: 'hidden'
      }}>
        <iframe
          ref={iframeRef}
          title="API Documentation"
          style={{
            width: '100%',
            height: '800px',
            border: 'none'
          }}
          src="/api-docs"
        />
      </div>
    </div>
  );
};

export default APIDocumentation;
