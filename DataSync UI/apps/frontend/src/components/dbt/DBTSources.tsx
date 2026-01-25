import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTSource } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import DBTSourceEditor from './DBTSourceEditor';

const DBTSources = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<DBTSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DBTSource | null>(null);
  const isMountedRef = useRef(true);

  const fetchSources = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const allSources = await dbtApi.getSources();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        let filtered = allSources;
        if (search) {
          const sanitizedSearch = sanitizeSearch(search, 100).toLowerCase();
          filtered = allSources.filter(s => 
            s.source_name.toLowerCase().includes(sanitizedSearch) ||
            s.schema_name.toLowerCase().includes(sanitizedSearch) ||
            s.table_name.toLowerCase().includes(sanitizedSearch) ||
            (s.description && s.description.toLowerCase().includes(sanitizedSearch))
          );
        }
        setSources(filtered);
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
  }, [search]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSources();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSources]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
  }, [searchInput]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (source: DBTSource) => {
    if (!confirm(`Are you sure you want to delete source "${source.source_name}" (${source.schema_name}.${source.table_name})?`)) {
      return;
    }
    try {
      await dbtApi.deleteSource(source.source_name, source.schema_name, source.table_name);
      fetchSources();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchSources]);

  const handleOpenModal = useCallback((source?: DBTSource) => {
    if (source) {
      setEditingSource(source);
    } else {
      setEditingSource(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingSource(null);
    fetchSources();
  }, [fetchSources]);

  if (loading && sources.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <AsciiPanel>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>DBT SOURCES</h2>
            <AsciiButton 
              label="New Source" 
              onClick={() => handleOpenModal()}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search sources..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: asciiColors.bg,
                color: asciiColors.text,
                border: `1px solid ${asciiColors.border}`,
                fontFamily: 'monospace',
              }}
            />
            <AsciiButton 
              label="Search" 
              onClick={handleSearch}
            />
          </div>

          {error && (
            <div style={{ color: asciiColors.red, marginBottom: '15px', padding: '10px', border: `1px solid ${asciiColors.red}` }}>
              {error}
            </div>
          )}
        </div>

        {sources.length === 0 ? (
          <div style={{ color: asciiColors.muted, textAlign: 'center', padding: '40px' }}>
            {search ? 'No sources found matching your search.' : 'No sources found. Create your first source!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sources.map((source) => (
              <div
                key={`${source.source_name}-${source.schema_name}-${source.table_name}`}
                style={{
                  padding: '15px',
                  border: `1px solid ${asciiColors.border}`,
                  backgroundColor: asciiColors.bg,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <span style={{ color: asciiColors.cyan, fontWeight: 'bold' }}>
                      {source.source_name}
                    </span>
                    <span style={{ color: asciiColors.muted }}>
                      {source.schema_name}.{source.table_name}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        fontSize: '10px',
                        border: `1px solid ${asciiColors.border}`,
                        color: asciiColors.muted,
                        backgroundColor: 'transparent',
                      }}
                    >
                      {source.source_type}
                    </span>
                    {source.active && (
                      <span
                        style={{
                          padding: '1px 6px',
                          fontSize: '10px',
                          border: `1px solid ${asciiColors.border}`,
                          color: asciiColors.muted,
                          backgroundColor: 'transparent',
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  {source.description && (
                    <div style={{ color: asciiColors.text, fontSize: '12px', marginTop: '5px' }}>
                      {source.description}
                    </div>
                  )}
                  {source.database_name && (
                    <div style={{ color: asciiColors.muted, fontSize: '11px', marginTop: '5px' }}>
                      Database: {source.database_name}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <AsciiButton
                    label="Edit"
                    onClick={() => handleOpenModal(source)}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Delete"
                    onClick={() => handleDelete(source)}
                    variant="ghost"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AsciiPanel>

      {isModalOpen && (
        <DBTSourceEditor
          source={editingSource}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default DBTSources;
