import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTModel } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import DBTModelEditor from './DBTModelEditor';
import DBTTestRunner from './DBTTestRunner';

const DBTModels = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<DBTModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<DBTModel | null>(null);
  const [selectedModel, setSelectedModel] = useState<DBTModel | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'tests'>('list');
  const [executingModel, setExecutingModel] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchModels = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const allModels = await dbtApi.getModels();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        let filtered = allModels;
        if (search) {
          const sanitizedSearch = sanitizeSearch(search, 100).toLowerCase();
          filtered = allModels.filter(m => 
            m.model_name.toLowerCase().includes(sanitizedSearch) ||
            (m.description && m.description.toLowerCase().includes(sanitizedSearch)) ||
            (m.schema_name && m.schema_name.toLowerCase().includes(sanitizedSearch))
          );
        }
        setModels(filtered);
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
    fetchModels();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchModels]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
  }, [searchInput]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) {
      return;
    }
    try {
      await dbtApi.deleteModel(modelName);
      fetchModels();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchModels]);

  const handleOpenModal = useCallback((model?: DBTModel) => {
    if (model) {
      setEditingModel(model);
    } else {
      setEditingModel(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingModel(null);
    fetchModels();
  }, [fetchModels]);

  const handleExecute = useCallback(async (modelName: string) => {
    try {
      setExecutingModel(modelName);
      await dbtApi.executeModel(modelName);
      fetchModels();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    } finally {
      setExecutingModel(null);
    }
  }, [fetchModels]);

  const handleViewTests = useCallback((model: DBTModel) => {
    setSelectedModel(model);
    setViewMode('tests');
  }, []);

  const getStatusColor = (status?: string) => {
    if (!status) return asciiColors.gray;
    switch (status.toLowerCase()) {
      case 'success': return asciiColors.green;
      case 'error': return asciiColors.red;
      case 'running': return asciiColors.yellow;
      default: return asciiColors.gray;
    }
  };

  const getMaterializationColor = (materialization?: string) => {
    switch (materialization) {
      case 'table': return asciiColors.blue;
      case 'view': return asciiColors.cyan;
      case 'incremental': return asciiColors.magenta;
      case 'ephemeral': return asciiColors.gray;
      default: return asciiColors.white;
    }
  };

  if (loading && models.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  if (viewMode === 'tests' && selectedModel) {
    return (
      <DBTTestRunner
        model={selectedModel}
        onBack={() => {
          setViewMode('list');
          setSelectedModel(null);
        }}
      />
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <AsciiPanel>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>DBT MODELS</h2>
            <AsciiButton onClick={() => handleOpenModal()}>
              {ascii.plus} New Model
            </AsciiButton>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search models..."
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
            <AsciiButton onClick={handleSearch}>
              {ascii.search} Search
            </AsciiButton>
          </div>

          {error && (
            <div style={{ color: asciiColors.red, marginBottom: '15px', padding: '10px', border: `1px solid ${asciiColors.red}` }}>
              {error}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
            Loading models...
          </div>
        ) : models.length === 0 ? (
          <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
            No models found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {models.map((model) => (
              <div
                key={model.model_name}
                style={{
                  border: `1px solid ${asciiColors.border}`,
                  padding: '15px',
                  backgroundColor: model.active ? asciiColors.bg : asciiColors.bgDark,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <span style={{ color: asciiColors.cyan, fontWeight: 'bold', fontSize: '16px' }}>
                        {model.model_name}
                      </span>
                      <span style={{ color: getMaterializationColor(model.materialization), fontSize: '12px' }}>
                        [{model.materialization || 'table'}]
                      </span>
                      {model.last_run_status && (
                        <span style={{ color: getStatusColor(model.last_run_status), fontSize: '12px' }}>
                          [{model.last_run_status}]
                        </span>
                      )}
                      {!model.active && (
                        <span style={{ color: asciiColors.gray, fontSize: '12px' }}>[INACTIVE]</span>
                      )}
                    </div>
                    <div style={{ color: asciiColors.gray, fontSize: '12px', marginBottom: '5px' }}>
                      Schema: {model.schema_name}
                      {model.database_name && ` | Database: ${model.database_name}`}
                      {model.version && ` | Version: ${model.version}`}
                    </div>
                    {model.description && (
                      <div style={{ color: asciiColors.text, fontSize: '13px', marginBottom: '5px' }}>
                        {model.description}
                      </div>
                    )}
                    {model.tags && model.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        {model.tags.map((tag, idx) => (
                          <span key={idx} style={{ color: asciiColors.yellow, fontSize: '11px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {model.last_run_time && (
                      <div style={{ color: asciiColors.gray, fontSize: '11px' }}>
                        Last run: {new Date(model.last_run_time).toLocaleString()}
                        {model.last_run_rows !== undefined && ` | Rows: ${model.last_run_rows.toLocaleString()}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                    <AsciiButton
                      onClick={() => handleExecute(model.model_name)}
                      disabled={executingModel === model.model_name}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      {executingModel === model.model_name ? ascii.loading : ascii.play} Execute
                    </AsciiButton>
                    <AsciiButton
                      onClick={() => handleViewTests(model)}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      {ascii.check} Tests
                    </AsciiButton>
                    <AsciiButton
                      onClick={() => handleOpenModal(model)}
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      {ascii.edit} Edit
                    </AsciiButton>
                    <AsciiButton
                      onClick={() => handleDelete(model.model_name)}
                      style={{ fontSize: '11px', padding: '5px 10px', color: asciiColors.red }}
                    >
                      {ascii.delete} Delete
                    </AsciiButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AsciiPanel>

      {isModalOpen && (
        <DBTModelEditor
          model={editingModel}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default DBTModels;
