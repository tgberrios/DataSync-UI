import { useState, useEffect, useCallback, useRef } from 'react';
import { monitorApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import SkeletonLoader from '../shared/SkeletonLoader';


/**
 * Monitor component
 * Displays active database queries with real-time updates and query details
 */
const Monitor = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [openQueryId, setOpenQueryId] = useState<number | null>(null);
  const [copiedQueryId, setCopiedQueryId] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  const fetchQueries = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      setError(null);
      const data = await monitorApi.getActiveQueries();
      if (isMountedRef.current) {
        setQueries(data || []);
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
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchQueries();
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchQueries();
      }
    }, 5000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchQueries]);

  const toggleQuery = useCallback((pid: number) => {
    setOpenQueryId(prev => prev === pid ? null : pid);
  }, []);

  const copyQuery = useCallback(async (query: string, pid: number) => {
    try {
      await navigator.clipboard.writeText(query);
      if (isMountedRef.current) {
        setCopiedQueryId(pid);
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedQueryId(null);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy query:', err);
      const textArea = document.createElement('textarea');
      textArea.value = query;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (isMountedRef.current) {
        setCopiedQueryId(pid);
        setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedQueryId(null);
          }
        }, 2000);
      }
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  if (loading && queries.length === 0) {
    return <SkeletonLoader variant="table" />;
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return asciiColors.success;
      case 'idle in transaction': return asciiColors.warning;
      case 'idle in transaction (aborted)': return asciiColors.danger;
      default: return asciiColors.muted;
    }
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "24px 32px",
      fontFamily: "Consolas",
      fontSize: 12,
      color: asciiColors.foreground,
      backgroundColor: asciiColors.background,
      display: "flex",
      flexDirection: "column",
      gap: 20
    }}>
      <h1 style={{
        fontSize: 18,
        fontFamily: "Consolas",
        fontWeight: 600,
        margin: 0,
        marginBottom: 16,
        padding: "12px 8px",
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        QUERY MONITOR
      </h1>

      {error && (
        <AsciiPanel title="ERROR">
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: asciiColors.danger, fontWeight: 600 }}>
              {ascii.blockFull} {error}
            </span>
          </div>
        </AsciiPanel>
      )}

      {!loading && !error && (
        <AsciiPanel title="ACTIVE QUERIES">
          {queries.length === 0 ? (
            <div style={{
              padding: 16,
              color: asciiColors.muted,
              fontSize: 11,
              border: `1px dashed ${asciiColors.border}`,
              borderRadius: 2,
              textAlign: "center"
            }}>
              {ascii.dot} No active queries found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queries.map((query) => (
                <div
                  key={query.pid}
                  style={{
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    backgroundColor: asciiColors.backgroundSoft,
                    overflow: "hidden",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    onClick={() => toggleQuery(query.pid)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 120px 120px 1fr 100px 100px",
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: "pointer",
                      gap: 12,
                      transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = asciiColors.background;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <div>
                      <span style={{ color: asciiColors.muted }}>PID:</span> {query.pid}
                    </div>
                    <div>
                      <span style={{ color: asciiColors.muted }}>{ascii.v}</span> {query.usename}
                    </div>
                    <div>
                      <span style={{ color: asciiColors.muted }}>{ascii.v}</span> {query.datname}
                    </div>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: asciiColors.foreground
                    }}>
                      {query.query?.substring(0, 50)}...
                    </div>
                    <div style={{ color: asciiColors.accent, fontWeight: 600 }}>
                      {query.duration}
                    </div>
                    <div>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 500,
                        border: `1px solid ${getStateColor(query.state)}`,
                        color: getStateColor(query.state),
                        backgroundColor: openQueryId === query.pid ? getStateColor(query.state) + "20" : "transparent"
                      }}>
                        {query.state === 'idle in transaction (aborted)' ? 'aborted' :
                         query.state === 'idle in transaction' ? 'in trans' : 
                         query.state}
                      </span>
                    </div>
                  </div>
                  
                  {openQueryId === query.pid && (
                    <div style={{
                      borderTop: `1px solid ${asciiColors.border}`,
                      padding: "16px",
                      backgroundColor: asciiColors.background,
                      animation: "slideDown 0.3s ease-out"
                    }}>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "150px 1fr",
                        gap: 12,
                        marginBottom: 16
                      }}>
                        <div style={{ color: asciiColors.muted, fontWeight: 500 }}>
                          Application:
                        </div>
                        <div style={{ color: asciiColors.foreground }}>
                          {query.application_name || '-'}
                        </div>
                        
                        <div style={{ color: asciiColors.muted, fontWeight: 500 }}>
                          Client Address:
                        </div>
                        <div style={{ color: asciiColors.foreground }}>
                          {query.client_addr || '-'}
                        </div>
                        
                        <div style={{ color: asciiColors.muted, fontWeight: 500 }}>
                          Started At:
                        </div>
                        <div style={{ color: asciiColors.foreground }}>
                          {formatDate(query.query_start)}
                        </div>
                        
                        <div style={{ color: asciiColors.muted, fontWeight: 500 }}>
                          Wait Event:
                        </div>
                        <div style={{ color: asciiColors.foreground }}>
                          {query.wait_event_type ? `${query.wait_event_type} (${query.wait_event})` : 'None'}
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ 
                          color: asciiColors.muted, 
                          fontWeight: 500,
                          marginBottom: 8
                        }}>
                          Full Query:
                        </div>
                        <pre style={{
                          margin: 0,
                          padding: "12px",
                          backgroundColor: asciiColors.backgroundSoft,
                          borderRadius: 2,
                          overflowX: "auto",
                          fontSize: 11,
                          border: `1px solid ${asciiColors.border}`,
                          fontFamily: "inherit",
                          color: asciiColors.foreground
                        }}>
                          {query.query}
                        </pre>
                      </div>
                      
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <AsciiButton
                          label={copiedQueryId === query.pid ? 'Copied!' : 'Copy Query'}
                          onClick={() => copyQuery(query.query, query.pid)}
                          variant="primary"
                        />
                        {copiedQueryId === query.pid && (
                          <span style={{
                            color: asciiColors.success,
                            fontSize: 11,
                            animation: "fadeIn 0.3s ease-in"
                          }}>
                            {ascii.bullet} Query copied to clipboard!
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AsciiPanel>
      )}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dots {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Monitor;
