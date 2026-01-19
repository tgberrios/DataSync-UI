import { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dbtApi, type DBTModel, type DBTTest, type DBTTestResult } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface DBTTestRunnerProps {
  model: DBTModel;
  onBack: () => void;
}

const DBTTestRunner = ({ model, onBack }: DBTTestRunnerProps) => {
  const [tests, setTests] = useState<DBTTest[]>([]);
  const [testResults, setTestResults] = useState<DBTTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const modelTests = await dbtApi.getTests(model.model_name);
      setTests(modelTests);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [model.model_name]);

  const fetchTestResults = useCallback(async () => {
    try {
      const results = await dbtApi.getTestResults(model.model_name);
      setTestResults(results);
    } catch (err) {
      console.error('Error fetching test results:', err);
    }
  }, [model.model_name]);

  useEffect(() => {
    fetchTests();
    fetchTestResults();
  }, [fetchTests, fetchTestResults]);

  const handleRunTests = useCallback(async () => {
    try {
      setRunning(true);
      setError(null);
      const result = await dbtApi.runTests(model.model_name);
      if (result.success) {
        setTestResults(result.results);
      }
      fetchTests();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setRunning(false);
    }
  }, [model.model_name, fetchTests]);

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

  const latestResults = testResults.slice(0, tests.length);

  return (
    <div style={{ padding: '20px' }}>
      <AsciiPanel>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h2 style={{ color: asciiColors.cyan, margin: 0, marginBottom: '5px' }}>
                TESTS: {model.model_name}
              </h2>
              <div style={{ color: asciiColors.gray, fontSize: '12px' }}>
                Schema: {model.schema_name} | Materialization: {model.materialization}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <AsciiButton onClick={handleRunTests} disabled={running}>
                {running ? ascii.loading : ascii.play} Run All Tests
              </AsciiButton>
              <AsciiButton onClick={onBack}>
                {ascii.back} Back
              </AsciiButton>
            </div>
          </div>

          {error && (
            <div style={{ color: asciiColors.red, marginBottom: '15px', padding: '10px', border: `1px solid ${asciiColors.red}` }}>
              {error}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
            Loading tests...
          </div>
        ) : tests.length === 0 ? (
          <div style={{ color: asciiColors.gray, textAlign: 'center', padding: '20px' }}>
            No tests defined for this model
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tests.map((test, idx) => {
              const result = latestResults.find(r => r.test_name === test.test_name);
              return (
                <div
                  key={test.id || idx}
                  style={{
                    border: `1px solid ${asciiColors.border}`,
                    padding: '15px',
                    backgroundColor: asciiColors.bg,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
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
                          <span style={{ color: getStatusColor(result.status), fontSize: '12px' }}>
                            {getStatusIcon(result.status)} {result.status.toUpperCase()}
                          </span>
                        )}
                        {!test.active && (
                          <span style={{ color: asciiColors.gray, fontSize: '12px' }}>[INACTIVE]</span>
                        )}
                      </div>
                      {test.description && (
                        <div style={{ color: asciiColors.text, fontSize: '13px', marginBottom: '5px' }}>
                          {test.description}
                        </div>
                      )}
                      {test.test_sql && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px' }}>Test SQL:</div>
                          <pre style={{
                            padding: '8px',
                            backgroundColor: asciiColors.bgDark,
                            border: `1px solid ${asciiColors.border}`,
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '100px',
                          }}>
                            {test.test_sql}
                          </pre>
                        </div>
                      )}
                      {result && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: asciiColors.bgDark, border: `1px solid ${getStatusColor(result.status)}` }}>
                          <div style={{ color: asciiColors.gray, fontSize: '11px', marginBottom: '5px' }}>
                            Last Run: {result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}
                            {result.execution_time_seconds !== undefined && ` | Duration: ${result.execution_time_seconds.toFixed(3)}s`}
                            {result.rows_affected !== undefined && ` | Rows Affected: ${result.rows_affected}`}
                          </div>
                          {result.error_message && (
                            <div style={{ color: asciiColors.red, fontSize: '12px', marginTop: '5px' }}>
                              Error: {result.error_message}
                            </div>
                          )}
                          {result.test_result && result.test_result.failure_count !== undefined && (
                            <div style={{ color: asciiColors.text, fontSize: '12px', marginTop: '5px' }}>
                              Failures: {result.test_result.failure_count}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AsciiPanel>
    </div>
  );
};

export default DBTTestRunner;
