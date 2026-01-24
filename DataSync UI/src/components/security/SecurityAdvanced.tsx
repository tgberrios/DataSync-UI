import React, { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import DataMasking from '../governance/DataMasking';
import Tokenization from './Tokenization';
import Anonymization from './Anonymization';
import Permissions from './Permissions';

const SecurityAdvanced = () => {
  const [activeTab, setActiveTab] = useState<'masking' | 'tokenization' | 'anonymization' | 'permissions'>('masking');

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md 
          }}>
            Security Advanced
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Advanced security features: dynamic masking, tokenization, anonymization, and fine-grained permissions
          </p>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
            borderBottom: `2px solid ${asciiColors.border}`,
            paddingBottom: theme.spacing.sm,
            flexWrap: 'wrap'
          }}>
            {(['masking', 'tokenization', 'anonymization', 'permissions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  border: 'none',
                  background: activeTab === tab ? asciiColors.accent : 'transparent',
                  color: activeTab === tab ? '#ffffff' : asciiColors.foreground,
                  borderRadius: `${2} ${2} 0 0`,
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 600 : 500,
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize',
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = asciiColors.backgroundSoft;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tab === 'masking' && 'Dynamic Masking'}
                {tab === 'tokenization' && 'Tokenization'}
                {tab === 'anonymization' && 'Anonymization'}
                {tab === 'permissions' && 'Fine-Grained Permissions'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {activeTab === 'masking' && <DataMasking />}
            {activeTab === 'tokenization' && <Tokenization />}
            {activeTab === 'anonymization' && <Anonymization />}
            {activeTab === 'permissions' && <Permissions />}
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default SecurityAdvanced;
