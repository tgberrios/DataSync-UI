import { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTModel, type DBTTest, type DBTTestResult } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DBTTestsViewProps {
  selectedModel: DBTModel | null;
  onModelSelect: (model: DBTModel | null) => void;
}

const DBTTestsView = ({ selectedModel, onModelSelect }: DBTTestsViewProps) => {
  const [tests, setTests] = useState<DBTTest[]>([]);
  const [testResults, setTestResults] = useState<DBTTestResult[]>([]);
  const [models, setModels] = useState<DBTModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [runningAll, setRunningAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allTests, allResults, allModels] = await Promise.all([
        dbtApi.getAllTests(),
        dbtApi.getAllTestResults(),
        dbtApi.getModels()
      ]);
      setTests(allTests);
      setTestResults(allResults);
      setModels(allModels);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunTest = useCallback(async (test: DBTTest) => {
    const testKey = `${test.model_name}-${test.test_name}`;
    try {
      setRunningTests(prev => new Set(prev).add(testKey));
      setError(null);
      await dbtApi.runTests(test.model_name);
      setTimeout(() => {
        fetchData();
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testKey);
          return next;
        });
      }, 2000);
    } catch (err) {
      setError(extractApiError(err));
      setRunningTests(prev => {
        const next = new Set(prev);
        next.delete(testKey);
        return next;
      });
      setTimeout(() => {
        fetchData();
      }, 2000);
    }
  }, [fetchData]);

  const handleRunAllTests = useCallback(async () => {
    try {
      setRunningAll(true);
      setError(null);
      if (selectedModel) {
        await dbtApi.runTests(selectedModel.model_name);
      } else {
        const modelNames = [...new Set(tests.map(t => t.model_name))];
        for (const modelName of modelNames) {
          await dbtApi.runTests(modelName);
        }
      }
      setTimeout(() => {
        fetchData();
        setRunningAll(false);
      }, 2000);
    } catch (err) {
      setError(extractApiError(err));
      setRunningAll(false);
      setTimeout(() => {
        fetchData();
      }, 2000);
    }
  }, [selectedModel, tests, fetchData]);

  const toggleTest = (testKey: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testKey)) {
        next.delete(testKey);
      } else {
        next.add(testKey);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass': return asciiColors.green;
      case 'fail': return asciiColors.red;
      case 'error': return asciiColors.red;
      case 'skipped': return asciiColors.gray;
      default: return asciiColors.gray;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass': return ascii.check;
      case 'fail': return ascii.cross;
      case 'error': return ascii.cross;
      case 'skipped': return ascii.dash;
      default: return ascii.dash;
    }
  };

  const getLatestResult = (test: DBTTest) => {
    return testResults
      .filter(r => r.model_name === test.model_name && r.test_name === test.test_name)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  };

  const getModel = (modelName: string) => {
    return models.find(m => m.model_name === modelName);
  };

  const filteredTests = selectedModel 
    ? tests.filter(t => t.model_name === selectedModel.model_name)
    : tests;

  const groupedTests = filteredTests.reduce((acc, test) => {
    if (!acc[test.model_name]) {
      acc[test.model_name] = [];
    }
    acc[test.model_name].push(test);
    return acc;
  }, {} as Record<string, DBTTest[]>);

  if (loading) {
    return (
      <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
        Loading tests...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: asciiColors.red, padding: '10px', border: `1px solid ${asciiColors.red}` }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: asciiColors.bgDark, border: `1px solid ${asciiColors.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {selectedModel ? (
              <span style={{ color: asciiColors.cyan, fontWeight: 'bold' }}>
                Filtered by: {selectedModel.model_name}
              </span>
            ) : (
              <span style={{ color: asciiColors.text }}>
                All Tests ({filteredTests.length} total)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <AsciiButton
              label={runningAll ? "Running..." : "Run All Tests"}
              onClick={handleRunAllTests}
              disabled={runningAll}
            />
            {selectedModel && (
              <AsciiButton
                label="Clear Filter"
                onClick={() => onModelSelect(null)}
                variant="ghost"
              />
            )}
          </div>
        </div>
      </div>

      {Object.keys(groupedTests).length === 0 ? (
        <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
          No tests found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {Object.entries(groupedTests).map(([modelName, modelTests]) => {
            const model = getModel(modelName);
            return (
              <div key={modelName} style={{ border: `1px solid ${asciiColors.border}`, padding: '15px', backgroundColor: asciiColors.bg }}>
                <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${asciiColors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: asciiColors.cyan, fontWeight: 'bold', fontSize: '14px' }}>
                        {modelName}
                      </span>
                      {model && (
                        <span style={{ color: asciiColors.gray, fontSize: '12px', marginLeft: '10px' }}>
                          Schema: {model.schema_name} | Materialization: {model.materialization}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <AsciiButton
                        label="Run All Tests"
                        onClick={async () => {
                          try {
                            setRunningAll(true);
                            await dbtApi.runTests(modelName);
                            setTimeout(() => {
                              fetchData();
                              setRunningAll(false);
                            }, 2000);
                          } catch (err) {
                            setError(extractApiError(err));
                            setRunningAll(false);
                            setTimeout(() => {
                              fetchData();
                            }, 2000);
                          }
                        }}
                        disabled={runningAll}
                        variant="ghost"
                      />
                      <AsciiButton
                        label="View Model"
                        onClick={() => onModelSelect(model || null)}
                        variant="ghost"
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {modelTests.map((test, idx) => {
                    const result = getLatestResult(test);
                    const testKey = `${test.model_name}-${test.test_name}`;
                    const isExpanded = expandedTests.has(testKey);
                    return (
                      <div
                        key={test.id || idx}
                        style={{
                          border: `1px solid ${asciiColors.border}`,
                          padding: '12px',
                          backgroundColor: asciiColors.bgDark,
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleTest(testKey)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                              <span style={{ color: asciiColors.cyan, fontWeight: 'bold' }}>
                                {test.test_name}
                              </span>
                              <span style={{ color: asciiColors.yellow, fontSize: '12px' }}>
                                [{test.test_type}]
                              </span>
                              {test.column_name && (
                                <span style={{ color: asciiColors.gray, fontSize: '12px' }}>
                                  Column: {test.column_name}
                                </span>
                              )}
                              {result && (
                                <span style={{ color: getStatusColor(result.status), fontSize: '12px', fontWeight: 'bold' }}>
                                  {getStatusIcon(result.status)} {result.status.toUpperCase()}
                                </span>
                              )}
                              {!test.active && (
                                <span style={{ color: asciiColors.gray, fontSize: '12px' }}>[INACTIVE]</span>
                              )}
                            </div>
                            {test.description && (
                              <div style={{ color: asciiColors.text, fontSize: '12px', marginBottom: '5px' }}>
                                {test.description}
                              </div>
                            )}
                            {result && !isExpanded && (
                              <div style={{ color: asciiColors.gray, fontSize: '11px' }}>
                                Last Run: {result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}
                                {result.execution_time_seconds !== undefined && result.execution_time_seconds !== null && ` | Duration: ${Number(result.execution_time_seconds).toFixed(3)}s`}
                                {result.rows_affected !== undefined && result.rows_affected !== null && ` | Rows: ${result.rows_affected}`}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <AsciiButton
                              label={runningTests.has(testKey) ? "Running..." : "Run Test"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunTest(test);
                              }}
                              variant="ghost"
                              disabled={runningTests.has(testKey)}
                            />
                            <div style={{ color: asciiColors.muted, fontSize: '12px', marginLeft: '5px', cursor: 'pointer' }}>
                              {isExpanded ? '▼' : '▶'}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${asciiColors.border}` }}>
                            {test.test_sql && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>
                                  Test SQL:
                                </div>
                                <pre style={{
                                  padding: '8px',
                                  backgroundColor: asciiColors.bg,
                                  border: `1px solid ${asciiColors.border}`,
                                  fontSize: '11px',
                                  overflow: 'auto',
                                  maxHeight: '150px',
                                  margin: 0,
                                }}>
                                  {test.test_sql}
                                </pre>
                              </div>
                            )}

                            {test.test_config && Object.keys(test.test_config).length > 0 && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>
                                  Test Config:
                                </div>
                                <pre style={{
                                  padding: '8px',
                                  backgroundColor: asciiColors.bg,
                                  border: `1px solid ${asciiColors.border}`,
                                  fontSize: '11px',
                                  overflow: 'auto',
                                  maxHeight: '100px',
                                  margin: 0,
                                }}>
                                  {JSON.stringify(test.test_config, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>
                                Test Details:
                              </div>
                              <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                                <div>Severity: <span style={{ color: asciiColors.text }}>{test.severity || 'error'}</span></div>
                                <div>Active: <span style={{ color: test.active ? asciiColors.green : asciiColors.gray }}>{test.active ? 'Yes' : 'No'}</span></div>
                                {test.created_at && (
                                  <div>Created: <span style={{ color: asciiColors.text }}>{new Date(test.created_at).toLocaleString()}</span></div>
                                )}
                                {test.updated_at && (
                                  <div>Updated: <span style={{ color: asciiColors.text }}>{new Date(test.updated_at).toLocaleString()}</span></div>
                                )}
                              </div>
                            </div>

                            {result && (
                              <div style={{ 
                                marginTop: '10px', 
                                padding: '10px', 
                                backgroundColor: asciiColors.bg, 
                                border: `1px solid ${getStatusColor(result.status)}` 
                              }}>
                                <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px', fontWeight: 'bold' }}>
                                  Latest Test Result:
                                </div>
                                <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '8px' }}>
                                  <div>Status: <span style={{ color: getStatusColor(result.status), fontWeight: 'bold' }}>{result.status.toUpperCase()}</span></div>
                                  <div>Run ID: <span style={{ color: asciiColors.text }}>{result.run_id || 'N/A'}</span></div>
                                  <div>Executed: <span style={{ color: asciiColors.text }}>{result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}</span></div>
                                  <div>Duration: <span style={{ color: asciiColors.text }}>{result.execution_time_seconds !== undefined && result.execution_time_seconds !== null ? `${Number(result.execution_time_seconds).toFixed(3)}s` : 'N/A'}</span></div>
                                  <div>Rows Affected: <span style={{ color: asciiColors.text }}>{result.rows_affected !== undefined && result.rows_affected !== null ? result.rows_affected : 'N/A'}</span></div>
                                </div>
                                {result.error_message && (
                                  <div style={{ marginTop: '8px', padding: '8px', backgroundColor: asciiColors.bgDark, border: `1px solid ${asciiColors.red}` }}>
                                    <div style={{ color: asciiColors.red, fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                                      Error Message:
                                    </div>
                                    <div style={{ color: asciiColors.red, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                      {result.error_message}
                                    </div>
                                  </div>
                                )}
                                {result.test_result && (
                                  <div style={{ marginTop: '8px' }}>
                                    <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                      Test Result Details:
                                    </div>
                                    {result.test_result.failure_count !== undefined && (
                                      <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                                        Failure Count: <span style={{ color: result.test_result.failure_count === 0 ? asciiColors.green : asciiColors.red }}>
                                          {result.test_result.failure_count}
                                        </span>
                                      </div>
                                    )}
                                    {result.test_result.test_sql && (
                                      <div style={{ marginTop: '4px' }}>
                                        <div style={{ color: asciiColors.gray, fontSize: '10px', marginBottom: '4px' }}>
                                          Executed SQL:
                                        </div>
                                        <pre style={{
                                          padding: '6px',
                                          backgroundColor: asciiColors.bgDark,
                                          border: `1px solid ${asciiColors.border}`,
                                          fontSize: '10px',
                                          overflow: 'auto',
                                          maxHeight: '100px',
                                          margin: 0,
                                        }}>
                                          {result.test_result.test_sql}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {!result && (
                              <div style={{ 
                                marginTop: '10px', 
                                padding: '10px', 
                                backgroundColor: asciiColors.bgDark, 
                                border: `1px solid ${asciiColors.border}`,
                                color: asciiColors.gray,
                                fontSize: '11px',
                                fontStyle: 'italic'
                              }}>
                                No test results available yet. Run the test to see results.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DBTTestsView;
