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
import DBTTestsView from './DBTTestsView';

const DBTModels = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<DBTModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<DBTModel | null>(null);
  const [selectedModel, setSelectedModel] = useState<DBTModel | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'tests'>('models');
  const [showDBTPlaybook, setShowDBTPlaybook] = useState(false);
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


  const handleViewTests = useCallback((model: DBTModel) => {
    setSelectedModel(model);
    setActiveTab('tests');
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

  return (
    <div style={{ padding: '20px' }}>
      <AsciiPanel>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>DBT MODELS</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <AsciiButton 
                label="DBT Playbook" 
                onClick={() => setShowDBTPlaybook(true)} 
                variant="ghost"
              />
              <AsciiButton 
                label="Macros" 
                onClick={() => window.location.href = '/dbt-macros'}
                variant="ghost"
              />
              <AsciiButton 
                label="New Model" 
                onClick={() => handleOpenModal()}
              />
            </div>
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

          <div style={{ 
            display: 'flex', 
            gap: 8, 
            marginBottom: 16, 
            borderBottom: `1px solid ${asciiColors.border}`, 
            paddingBottom: 8 
          }}>
            <AsciiButton
              label="Models"
              onClick={() => setActiveTab('models')}
              variant={activeTab === 'models' ? 'primary' : 'ghost'}
            />
            <AsciiButton
              label="Tests"
              onClick={() => setActiveTab('tests')}
              variant={activeTab === 'tests' ? 'primary' : 'ghost'}
            />
          </div>
        </div>

        {activeTab === 'tests' ? (
          <DBTTestsView 
            selectedModel={selectedModel}
            onModelSelect={(model) => {
              setSelectedModel(model);
              if (model) {
                setActiveTab('models');
              }
            }}
          />
        ) : loading ? (
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
                  <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                    <AsciiButton
                      label="View Tests"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel(model);
                        setActiveTab('tests');
                      }}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(model);
                      }}
                      variant="ghost"
                    />
                    <AsciiButton
                      label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(model.model_name);
                      }}
                      variant="ghost"
                    />
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

      {showDBTPlaybook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowDBTPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DBT MODELS PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    DBT (data build tool) Models are SQL-based transformation models that follow the "analytics engineering" methodology. 
                    Models are written as SQL queries that transform raw data into analytics-ready tables, views, or incremental models. 
                    The system supports dbt-style materializations, macros, tests, dependencies, and version control integration.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY CONCEPTS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>MATERIALIZATIONS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Table:</strong> Creates a physical table (full refresh on each run)<br/>
                        • <strong>View:</strong> Creates a database view (no storage, computed on query)<br/>
                        • <strong>Incremental:</strong> Only processes new/changed rows (efficient for large datasets)<br/>
                        • <strong>Ephemeral:</strong> CTE-based model (no database object created, used in other models)
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>MODEL DEPENDENCIES</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>depends_on:</strong> Array of model names that this model depends on<br/>
                        • <strong>Dependency Resolution:</strong> System automatically builds models in correct order<br/>
                        • <strong>Reference Syntax:</strong> Use <code style={{ color: asciiColors.accent }}>{`{{ ref('model_name') }}`}</code> in SQL to reference other models<br/>
                        • <strong>Circular Dependencies:</strong> Detected and prevented during validation
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 6, fontSize: 11 }}>TESTS & DATA QUALITY</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Test Types:</strong> not_null, unique, relationships, accepted_values, custom, expression<br/>
                        • <strong>Column Tests:</strong> Validate specific columns meet business rules<br/>
                        • <strong>Model Tests:</strong> Validate entire model outputs<br/>
                        • <strong>Severity:</strong> error (fails build) or warn (logs warning)
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} EXECUTION PROCESS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>1. MODEL COMPILATION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Resolve <code style={{ color: asciiColors.accent }}>{`{{ ref('model_name') }}`}</code> references to actual table/view names</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Expand macro calls <code style={{ color: asciiColors.accent }}>{`{{ macro_name(args) }}`}</code> to SQL code</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Replace variables and configuration values</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Generate final compiled SQL query</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>2. DEPENDENCY RESOLUTION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Build dependency graph from <code style={{ color: asciiColors.accent }}>depends_on</code> arrays</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Topological sort to determine execution order</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Execute upstream models before downstream models</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Parallel execution when dependencies allow</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 8, fontSize: 11 }}>3. MATERIALIZATION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>Table:</strong> <code style={{ color: asciiColors.accent }}>CREATE TABLE AS SELECT</code> or <code style={{ color: asciiColors.accent }}>DROP + CREATE</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>View:</strong> <code style={{ color: asciiColors.accent }}>CREATE OR REPLACE VIEW</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> <strong>Incremental:</strong> <code style={{ color: asciiColors.accent }}>INSERT</code> new rows or <code style={{ color: asciiColors.accent }}>MERGE</code> based on unique key</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> <strong>Ephemeral:</strong> No database object, SQL inlined into dependent models</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 8, fontSize: 11 }}>4. TEST EXECUTION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Run all tests defined for the model</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Column tests: Validate not_null, unique, accepted_values, etc.</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Relationship tests: Validate foreign key relationships</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Custom tests: Execute custom SQL test expressions</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY FEATURES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>SQL-Based:</strong> Write transformations in standard SQL (PostgreSQL, Snowflake, BigQuery, Redshift)
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Macro Support:</strong> Reusable SQL functions with parameters
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Dependency Management:</strong> Automatic build order resolution
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Data Quality Tests:</strong> Built-in and custom tests for validation
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Version Control:</strong> Git commit hash and branch tracking
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Incremental Models:</strong> Efficient processing of large datasets
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: asciiColors.success }}>{ascii.blockFull}</span> <strong>Documentation:</strong> Model and column-level documentation
                    </div>
                  </div>
                </div>

                <div style={{ 
                  marginTop: 16, 
                  padding: 12, 
                  background: asciiColors.backgroundSoft, 
                  borderRadius: 2,
                  border: `1px solid ${asciiColors.border}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: asciiColors.muted, marginBottom: 4 }}>
                    {ascii.blockSemi} Best Practices
                  </div>
                  <div style={{ fontSize: 11, color: asciiColors.foreground, lineHeight: 1.6 }}>
                    • Use incremental materialization for large fact tables that grow over time<br/>
                    • Use views for lightweight transformations that don't need materialization<br/>
                    • Define clear dependencies using <code style={{ color: asciiColors.accent }}>depends_on</code> array<br/>
                    • Write comprehensive tests to catch data quality issues early<br/>
                    • Use macros to avoid SQL code duplication<br/>
                    • Document models and columns for better maintainability<br/>
                    • Use tags to organize and filter models (e.g., "staging", "marts", "intermediate")<br/>
                    • Keep models focused on single business concepts (one model = one purpose)<br/>
                    • Test models in development before deploying to production<br/>
                    • Monitor model execution times and optimize slow queries
                  </div>
                </div>

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <AsciiButton
                    label="Close"
                    onClick={() => setShowDBTPlaybook(false)}
                    variant="ghost"
                  />
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBTModels;
