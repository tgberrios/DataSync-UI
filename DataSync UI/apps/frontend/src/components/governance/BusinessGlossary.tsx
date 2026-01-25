import React, { useState, useEffect, useCallback, useRef } from 'react';
import { businessGlossaryApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { theme } from '../../theme/theme';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { Container } from '../shared/BaseComponents';
import SkeletonLoader from '../shared/SkeletonLoader';

interface GlossaryTerm {
  id: number;
  term: string;
  definition: string;
  category?: string;
  business_domain?: string;
  owner?: string;
  steward?: string;
  related_tables?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

const BusinessGlossary = () => {
  const [activeTab, setActiveTab] = useState<'terms' | 'dictionary' | 'links'>('terms');
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [dictionary, setDictionary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const isMountedRef = useRef(true);

  const fetchTerms = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      const data = await businessGlossaryApi.getTerms({ search: searchQuery });
      if (isMountedRef.current) {
        setTerms(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [searchQuery]);

  const fetchDictionary = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setError(null);
      const data = await businessGlossaryApi.getDictionary();
      if (isMountedRef.current) {
        setDictionary(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'terms') {
      fetchTerms();
    } else if (activeTab === 'dictionary') {
      fetchDictionary();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [activeTab, fetchTerms, fetchDictionary]);

  if (loading && terms.length === 0) {
    return (
      <Container>
        <SkeletonLoader />
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ 
        padding: theme.spacing.lg, 
        fontFamily: 'Consolas', 
        fontSize: 12,
        background: asciiColors.background
      }}>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            margin: `0 0 ${theme.spacing.md} 0`,
            color: asciiColors.foreground
          }}>
            {ascii.blockFull} BUSINESS GLOSSARY
          </h1>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <AsciiButton
            label="Terms"
            onClick={() => setActiveTab('terms')}
            variant={activeTab === 'terms' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Dictionary"
            onClick={() => setActiveTab('dictionary')}
            variant={activeTab === 'dictionary' ? 'primary' : 'ghost'}
          />
          <AsciiButton
            label="Links"
            onClick={() => setActiveTab('links')}
            variant={activeTab === 'links' ? 'primary' : 'ghost'}
          />
        </div>

        {error && (
          <div style={{ 
            padding: theme.spacing.sm, 
            background: asciiColors.foreground + '20',
            border: `1px solid ${asciiColors.foreground}`,
            marginBottom: theme.spacing.md,
            color: asciiColors.foreground
          }}>
            Error: {error}
          </div>
        )}

        {activeTab === 'terms' && (
          <AsciiPanel title="GLOSSARY TERMS">
            <div style={{ marginBottom: theme.spacing.md }}>
              <input
                type="text"
                placeholder="Search terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  background: asciiColors.background,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas',
                  fontSize: 12
                }}
              />
            </div>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {terms.map((term) => (
                <div
                  key={term.id}
                  onClick={() => setSelectedTerm(term)}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs,
                    cursor: 'pointer',
                    background: selectedTerm?.id === term.id ? asciiColors.accent + '20' : 'transparent'
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {term.term}
                  </div>
                  <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                    {term.definition.substring(0, 100)}...
                  </div>
                  {term.business_domain && (
                    <div style={{ color: asciiColors.muted, fontSize: 10, marginTop: theme.spacing.xs }}>
                      Domain: {term.business_domain}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'dictionary' && (
          <AsciiPanel title="DATA DICTIONARY">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {dictionary.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: theme.spacing.sm,
                    border: `1px solid ${asciiColors.border}`,
                    marginBottom: theme.spacing.xs
                  }}
                >
                  <div style={{ fontWeight: 600, color: asciiColors.foreground }}>
                    {entry.schema_name}.{entry.table_name}.{entry.column_name}
                  </div>
                  {entry.business_description && (
                    <div style={{ color: asciiColors.muted, fontSize: 11, marginTop: theme.spacing.xs }}>
                      {entry.business_description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AsciiPanel>
        )}

        {activeTab === 'links' && (
          <AsciiPanel title="TERM LINKS">
            <div style={{ color: asciiColors.muted }}>
              Select a term to view its linked tables
            </div>
          </AsciiPanel>
        )}
      </div>
    </Container>
  );
};

export default BusinessGlossary;
