import React, { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import ImpactAnalysis from './ImpactAnalysis';
import LineageGraphView from './LineageGraphView';
import ColumnLineageView from './ColumnLineageView';
import TransformationLineageView from './TransformationLineageView';
import PipelineDocumentation from './PipelineDocumentation';
import DictionaryGenerator from './DictionaryGenerator';
import APIDocumentation from './APIDocumentation';

const MetadataDocumentation = () => {
  const [activeTab, setActiveTab] = useState<'impact' | 'lineage-graph' | 'column-lineage' | 'transformation-lineage' | 'pipeline-docs' | 'dictionary' | 'api-docs'>('impact');

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
            Metadata & Documentation
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Manage metadata, analyze impact, visualize lineage, and generate documentation
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
            {(['impact', 'lineage-graph', 'column-lineage', 'transformation-lineage', 'pipeline-docs', 'dictionary', 'api-docs'] as const).map(tab => (
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
                {tab === 'impact' && 'Impact Analysis'}
                {tab === 'lineage-graph' && 'Lineage Graph'}
                {tab === 'column-lineage' && 'Column Lineage'}
                {tab === 'transformation-lineage' && 'Transformation Lineage'}
                {tab === 'pipeline-docs' && 'Pipeline Docs'}
                {tab === 'dictionary' && 'Dictionary Generator'}
                {tab === 'api-docs' && 'API Docs'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {activeTab === 'impact' && <ImpactAnalysis />}
            {activeTab === 'lineage-graph' && <LineageGraphView />}
            {activeTab === 'column-lineage' && <ColumnLineageView />}
            {activeTab === 'transformation-lineage' && <TransformationLineageView />}
            {activeTab === 'pipeline-docs' && <PipelineDocumentation />}
            {activeTab === 'dictionary' && <DictionaryGenerator />}
            {activeTab === 'api-docs' && <APIDocumentation />}
          </div>
        </div>
      </AsciiPanel>
    </div>
  );
};

export default MetadataDocumentation;
