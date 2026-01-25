import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { bigDataApi, type DistributedJob } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

const DistributedJobsMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<DistributedJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DistributedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    executionMode: '',
    search: '',
  });
  const [jobLogs, setJobLogs] = useState<string>('');
  const [jobMetrics, setJobMetrics] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.executionMode) params.executionMode = filters.executionMode;
      if (filters.search) params.search = filters.search;

      const response = await bigDataApi.getDistributedJobs(params);
      if (isMountedRef.current) {
        setJobs(response.jobs || []);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        // Silently handle 404 - endpoints may not exist yet in backend
        if (err?.response?.status === 404) {
          setJobs([]);
          return;
        }
        setError(extractApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    fetchJobs();

    // Auto-refresh every 5 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchJobs]);

  const handleJobSelect = useCallback(async (job: DistributedJob) => {
    setSelectedJob(job);
    setShowLogs(false);
    setShowMetrics(false);
    setJobLogs('');
    setJobMetrics(null);
  }, []);

  const handleViewLogs = useCallback(async (jobId: string) => {
    try {
      const response = await bigDataApi.getDistributedJobLogs(jobId, 1000);
      setJobLogs(response.logs || '');
      setShowLogs(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setJobLogs('Logs not available - endpoint not implemented yet');
        setShowLogs(true);
        return;
      }
      setError(extractApiError(err));
    }
  }, []);

  const handleViewMetrics = useCallback(async (jobId: string) => {
    try {
      const response = await bigDataApi.getDistributedJobMetrics(jobId);
      setJobMetrics(response.metrics || response);
      setShowMetrics(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setJobMetrics({ message: 'Metrics not available - endpoint not implemented yet' });
        setShowMetrics(true);
        return;
      }
      setError(extractApiError(err));
    }
  }, []);

  const handleCancelJob = useCallback(async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;

    try {
      await bigDataApi.cancelDistributedJob(jobId);
      fetchJobs();
      if (selectedJob?.jobId === jobId) {
        setSelectedJob(null);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('Cancel endpoint not implemented yet');
        return;
      }
      setError(extractApiError(err));
    }
  }, [selectedJob, fetchJobs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return asciiColors.accent;
      case 'running':
        return asciiColors.foreground;
      case 'failed':
        return asciiColors.foreground;
      case 'cancelled':
        return asciiColors.muted;
      default:
        return asciiColors.border;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading && jobs.length === 0) {
    return <SkeletonLoader />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: theme.spacing.lg }}>
      <div>
        <div style={{ marginBottom: theme.spacing.md }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.sm
          }}>
            Distributed Jobs
          </h3>
        </div>

        {error && (
          <div style={{
            padding: theme.spacing.md,
            border: `1px solid ${asciiColors.border}`,
            borderRadius: 2,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          flexWrap: 'wrap'
        }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.executionMode}
            onChange={(e) => setFilters(prev => ({ ...prev, executionMode: e.target.value }))}
            style={{
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          >
            <option value="">All Modes</option>
            <option value="local">Local</option>
            <option value="distributed">Distributed</option>
          </select>

          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search jobs..."
            style={{
              flex: 1,
              minWidth: '200px',
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              color: asciiColors.foreground,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}
          />
        </div>

        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          {jobs.length === 0 ? (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: asciiColors.muted
            }}>
              No jobs found
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {jobs.map(job => (
                <div
                  key={job.jobId}
                  onClick={() => handleJobSelect(job)}
                  style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${asciiColors.border}`,
                    cursor: 'pointer',
                    backgroundColor: selectedJob?.jobId === job.jobId ? asciiColors.backgroundSoft : 'transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedJob?.jobId !== job.jobId) {
                      e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedJob?.jobId !== job.jobId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: theme.spacing.xs
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        color: asciiColors.foreground,
                        marginBottom: theme.spacing.xs,
                        fontFamily: 'Consolas, monospace',
                        fontSize: 12
                      }}>
                        {job.taskId || job.jobId}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: asciiColors.muted,
                        marginBottom: theme.spacing.xs
                      }}>
                        {job.taskType} • {job.executionMode}
                      </div>
                    </div>
                    <div style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      border: `1px solid ${getStatusColor(job.status)}`,
                      borderRadius: 2,
                      backgroundColor: 'transparent',
                      color: getStatusColor(job.status),
                      fontSize: 11,
                      fontFamily: 'Consolas, monospace',
                      textTransform: 'uppercase'
                    }}>
                      {job.status}
                    </div>
                  </div>
                  {job.rowsProcessed !== undefined && (
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted
                    }}>
                      Rows: {job.rowsProcessed.toLocaleString()}
                    </div>
                  )}
                  {job.duration && (
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted
                    }}>
                      Duration: {formatDuration(job.duration)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <div style={{
          border: `1px solid ${asciiColors.border}`,
          borderRadius: 2,
          padding: theme.spacing.md,
          backgroundColor: asciiColors.backgroundSoft
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md,
            borderBottom: `1px solid ${asciiColors.border}`,
            paddingBottom: theme.spacing.sm
          }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              color: asciiColors.foreground,
              margin: 0
            }}>
              Job Details
            </h4>
            {selectedJob.status === 'running' && (
              <AsciiButton
                onClick={() => handleCancelJob(selectedJob.jobId)}
                style={{ fontSize: 11, padding: `${theme.spacing.xs} ${theme.spacing.sm}` }}
              >
                Cancel
              </AsciiButton>
            )}
          </div>

          <div style={{ marginBottom: theme.spacing.md }}>
            <div style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 11,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.xs
            }}>
              <strong>Job ID:</strong> {selectedJob.jobId}
            </div>
            <div style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 11,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.xs
            }}>
              <strong>Task ID:</strong> {selectedJob.taskId}
            </div>
            <div style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 11,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.xs
            }}>
              <strong>Type:</strong> {selectedJob.taskType}
            </div>
            <div style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 11,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.xs
            }}>
              <strong>Mode:</strong> {selectedJob.executionMode}
            </div>
            <div style={{
              fontFamily: 'Consolas, monospace',
              fontSize: 11,
              color: asciiColors.foreground,
              marginBottom: theme.spacing.xs
            }}>
              <strong>Status:</strong> {selectedJob.status}
            </div>
            {selectedJob.rowsProcessed !== undefined && (
              <div style={{
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.xs
              }}>
                <strong>Rows Processed:</strong> {selectedJob.rowsProcessed.toLocaleString()}
              </div>
            )}
            {selectedJob.outputPath && (
              <div style={{
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.xs
              }}>
                <strong>Output:</strong> {selectedJob.outputPath}
              </div>
            )}
            {selectedJob.startTime && (
              <div style={{
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.xs
              }}>
                <strong>Start:</strong> {new Date(selectedJob.startTime).toLocaleString()}
              </div>
            )}
            {selectedJob.endTime && (
              <div style={{
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.xs
              }}>
                <strong>End:</strong> {new Date(selectedJob.endTime).toLocaleString()}
              </div>
            )}
            {selectedJob.duration && (
              <div style={{
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                marginBottom: theme.spacing.xs
              }}>
                <strong>Duration:</strong> {formatDuration(selectedJob.duration)}
              </div>
            )}
            {selectedJob.errorMessage && (
              <div style={{
                padding: theme.spacing.sm,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                marginTop: theme.spacing.sm,
                fontFamily: 'Consolas, monospace',
                fontSize: 11
              }}>
                <strong>Error:</strong> {selectedJob.errorMessage}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <AsciiButton
              onClick={() => handleViewLogs(selectedJob.jobId)}
              style={{ width: '100%' }}
            >
              {showLogs ? 'Hide Logs' : 'View Logs'}
            </AsciiButton>
            <AsciiButton
              onClick={() => handleViewMetrics(selectedJob.jobId)}
              style={{ width: '100%' }}
            >
              {showMetrics ? 'Hide Metrics' : 'View Metrics'}
            </AsciiButton>
          </div>

          {showLogs && jobLogs && (
            <div style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <pre style={{
                margin: 0,
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {jobLogs}
              </pre>
            </div>
          )}

          {showMetrics && jobMetrics && (
            <div style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.sm,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              backgroundColor: asciiColors.background,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <pre style={{
                margin: 0,
                fontFamily: 'Consolas, monospace',
                fontSize: 11,
                color: asciiColors.foreground,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(jobMetrics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DistributedJobsMonitor;
