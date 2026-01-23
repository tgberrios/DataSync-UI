import { useState, useEffect, useCallback, useRef } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTMacro } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { sanitizeSearch } from '../../utils/validation';
import SkeletonLoader from '../shared/SkeletonLoader';
import DBTMacroEditor from './DBTMacroEditor';

const DBTMacros = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [macros, setMacros] = useState<DBTMacro[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<DBTMacro | null>(null);
  const [showMacrosPlaybook, setShowMacrosPlaybook] = useState(false);
  const isMountedRef = useRef(true);

  const fetchMacros = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    const minLoadingTime = 300;
    
    try {
      setLoading(true);
      setError(null);
      const allMacros = await dbtApi.getMacros();
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      await new Promise(resolve => setTimeout(resolve, remaining));
      
      if (isMountedRef.current) {
        let filtered = allMacros;
        if (search) {
          const sanitizedSearch = sanitizeSearch(search, 100).toLowerCase();
          filtered = allMacros.filter(m => 
            m.macro_name.toLowerCase().includes(sanitizedSearch) ||
            (m.description && m.description.toLowerCase().includes(sanitizedSearch))
          );
        }
        setMacros(filtered);
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
    fetchMacros();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMacros]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
  }, [searchInput]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleDelete = useCallback(async (macroName: string) => {
    if (!confirm(`Are you sure you want to delete macro "${macroName}"?`)) {
      return;
    }
    try {
      await dbtApi.deleteMacro(macroName);
      fetchMacros();
    } catch (err) {
      if (isMountedRef.current) {
        setError(extractApiError(err));
      }
    }
  }, [fetchMacros]);

  const handleOpenModal = useCallback((macro?: DBTMacro) => {
    if (macro) {
      setEditingMacro(macro);
    } else {
      setEditingMacro(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMacro(null);
    fetchMacros();
  }, [fetchMacros]);

  if (loading && macros.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <AsciiPanel>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ color: asciiColors.cyan, margin: 0 }}>DBT MACROS</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <AsciiButton 
                label="Macros Playbook" 
                onClick={() => setShowMacrosPlaybook(true)} 
                variant="ghost"
              />
              <AsciiButton 
                label="New Macro" 
                onClick={() => handleOpenModal()}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search macros..."
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

        {macros.length === 0 ? (
          <div style={{ color: asciiColors.muted, textAlign: 'center', padding: '40px' }}>
            {search ? 'No macros found matching your search.' : 'No macros found. Create your first macro!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {macros.map((macro) => (
              <div
                key={macro.id || macro.macro_name}
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
                      {macro.macro_name}
                    </span>
                    {macro.active && (
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
                  {macro.description && (
                    <div style={{ color: asciiColors.text, fontSize: '12px', marginTop: '5px' }}>
                      {macro.description}
                    </div>
                  )}
                  {macro.return_type && (
                    <div style={{ color: asciiColors.muted, fontSize: '11px', marginTop: '5px' }}>
                      Returns: {macro.return_type}
                    </div>
                  )}
                  {macro.tags && macro.tags.length > 0 && (
                    <div style={{ color: asciiColors.muted, fontSize: '11px', marginTop: '5px' }}>
                      Tags: {macro.tags.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <AsciiButton
                    label="Edit"
                    onClick={() => handleOpenModal(macro)}
                    variant="ghost"
                  />
                  <AsciiButton
                    label="Delete"
                    onClick={() => handleDelete(macro.macro_name)}
                    variant="ghost"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AsciiPanel>

      {isModalOpen && (
        <DBTMacroEditor
          macro={editingMacro}
          onClose={handleCloseModal}
        />
      )}

      {showMacrosPlaybook && (
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
        onClick={() => setShowMacrosPlaybook(false)}
        >
          <div style={{
            width: '90%',
            maxWidth: 1000,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <AsciiPanel title="DBT MACROS PLAYBOOK">
              <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} OVERVIEW
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    DBT Macros are reusable SQL functions that can be called from within DBT models. They allow you to write DRY (Don't Repeat Yourself) code by encapsulating common SQL patterns, transformations, and business logic. Macros are written in SQL with Jinja templating syntax and can accept parameters, making them flexible and powerful tools for data transformation.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} KEY CONCEPTS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>MACRO DEFINITION</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Macro Name:</strong> Unique identifier for the macro<br/>
                        • <strong>Macro SQL:</strong> SQL code with Jinja templating syntax<br/>
                        • <strong>Parameters:</strong> JSON array defining input parameters (name, type, default value)<br/>
                        • <strong>Return Type:</strong> Expected return type (e.g., string, integer, boolean, table)
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>JINJA TEMPLATING</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Variables:</strong> <code style={{ color: asciiColors.accent }}>{`{{ variable_name }}`}</code> - Insert variable values<br/>
                        • <strong>Parameters:</strong> <code style={{ color: asciiColors.accent }}>{`{{ param_name }}`}</code> - Access macro parameters<br/>
                        • <strong>Conditionals:</strong> <code style={{ color: asciiColors.accent }}>{`{% if condition %}...{% endif %}`}</code> - Conditional logic<br/>
                        • <strong>Loops:</strong> <code style={{ color: asciiColors.accent }}>{`{% for item in list %}...{% endfor %}`}</code> - Iteration
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.success, marginBottom: 6, fontSize: 11 }}>MACRO USAGE IN MODELS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Call Syntax:</strong> <code style={{ color: asciiColors.accent }}>{`{{ macro_name(arg1, arg2) }}`}</code><br/>
                        • <strong>Inline Usage:</strong> Macros can be used anywhere in model SQL<br/>
                        • <strong>Nested Calls:</strong> Macros can call other macros<br/>
                        • <strong>Compilation:</strong> Macros are expanded during model compilation
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} COMMON MACRO PATTERNS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>1. COLUMN AGGREGATION MACRO</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Purpose: Aggregate columns with custom logic</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Example: <code style={{ color: asciiColors.accent }}>{`{{ aggregate_columns(table, ['col1', 'col2'], 'SUM') }}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Use Case: Dynamic aggregation based on column list</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>2. DATE FORMATTING MACRO</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Purpose: Standardize date formatting across models</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Example: <code style={{ color: asciiColors.accent }}>{`{{ format_date(date_column, 'YYYY-MM-DD') }}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Use Case: Consistent date handling</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>3. SCHEMA QUALIFICATION MACRO</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Purpose: Generate fully qualified table/column names</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Example: <code style={{ color: asciiColors.accent }}>{`{{ qualify_name(schema, table, column) }}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Use Case: Cross-database compatibility</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>4. CONDITIONAL LOGIC MACRO</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Purpose: Apply conditional transformations</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Example: <code style={{ color: asciiColors.accent }}>{`{{ conditional_transform(value, condition, true_value, false_value) }}`}</code></div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Use Case: Business rule implementation</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} BEST PRACTICES
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>MACRO DESIGN</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Single Responsibility:</strong> Each macro should do one thing well<br/>
                        • <strong>Clear Parameters:</strong> Use descriptive parameter names with types<br/>
                        • <strong>Documentation:</strong> Provide examples and usage instructions<br/>
                        • <strong>Error Handling:</strong> Validate inputs and provide meaningful errors
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>PERFORMANCE</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Avoid Over-Macroing:</strong> Don't create macros for simple SQL<br/>
                        • <strong>Compile-Time Expansion:</strong> Macros are expanded at compile time, not runtime<br/>
                        • <strong>Reusability:</strong> Create macros for patterns used in 3+ models<br/>
                        • <strong>Testing:</strong> Test macros with various inputs before production use
                      </div>
                    </div>
                    <div style={{ marginBottom: 12, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.accent, marginBottom: 6, fontSize: 11 }}>MAINTENANCE</div>
                      <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                        • <strong>Versioning:</strong> Track macro changes and versions<br/>
                        • <strong>Tags:</strong> Use tags to categorize macros (e.g., "date", "aggregation", "validation")<br/>
                        • <strong>Active Status:</strong> Mark deprecated macros as inactive<br/>
                        • <strong>Migration Path:</strong> Provide migration guide when updating macros
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} EXAMPLE MACRO
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontSize: 11, fontFamily: 'Consolas', whiteSpace: 'pre-wrap', color: asciiColors.text }}>
{`-- Macro: generate_date_range
-- Parameters: start_date, end_date, interval_type
-- Returns: SQL for date range generation

{% macro generate_date_range(start_date, end_date, interval_type='day') %}
  SELECT 
    date_series.date_value,
    date_series.date_value::date as date_only
  FROM (
    SELECT generate_series(
      '{{ start_date }}'::date,
      '{{ end_date }}'::date,
      '1 {{ interval_type }}'::interval
    ) as date_value
  ) date_series
{% endmacro %}`}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: asciiColors.muted }}>
                        Usage in model: <code style={{ color: asciiColors.accent }}>{`{{ generate_date_range('2024-01-01', '2024-12-31', 'day') }}`}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: asciiColors.accent, marginBottom: 12 }}>
                    {ascii.blockFull} INTEGRATION WITH MODELS
                  </div>
                  <div style={{ color: asciiColors.foreground, marginLeft: 16 }}>
                    <div style={{ marginBottom: 16, padding: '12px', backgroundColor: asciiColors.backgroundSoft, borderRadius: 2, border: `1px solid ${asciiColors.border}` }}>
                      <div style={{ fontWeight: 600, color: asciiColors.muted, marginBottom: 8, fontSize: 11 }}>MACRO EXPANSION PROCESS</div>
                      <div style={{ fontSize: 11, lineHeight: 1.6, marginLeft: 8 }}>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Model SQL is parsed for macro calls <code style={{ color: asciiColors.accent }}>{`{{ macro_name(args) }}`}</code></div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Macro definition is retrieved from metadata</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Parameters are substituted into macro SQL</div>
                        <div style={{ marginBottom: 4 }}><span style={{ color: asciiColors.muted }}>└─</span> Jinja templating is processed</div>
                        <div><span style={{ color: asciiColors.muted }}>└─</span> Expanded SQL is inserted into model</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AsciiPanel>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBTMacros;
