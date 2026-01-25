import { useState, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { schemaMigrationsApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface ChainLink {
  migration_name: string;
  version: string;
  prev_hash: string | null;
  current_hash: string;
  chain_position: number;
  status: string;
  is_genesis: boolean;
}

interface ChainStatus {
  valid: boolean;
  broken_at?: string;
  missing: string[];
  total_links: number;
  environment: string;
}

const MigrationChainView = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState('dev');
  const [chainLinks, setChainLinks] = useState<ChainLink[]>([]);
  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const fetchChain = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schemaMigrationsApi.getChain(selectedEnvironment);
      setChainLinks(response.chain || []);
      setChainStatus(response.status || null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const validateChain = async () => {
    try {
      setValidating(true);
      setError(null);
      const response = await schemaMigrationsApi.validateChain(selectedEnvironment);
      setChainStatus(response);
      if (response.valid) {
        alert('✅ Chain is valid and intact!');
      } else {
        alert(`❌ Chain is broken at: ${response.broken_at}\nMissing migrations: ${response.missing.join(', ')}`);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    fetchChain();
  }, [selectedEnvironment]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return asciiColors.success;
      case 'PENDING':
        return asciiColors.warning;
      case 'FAILED':
        return asciiColors.danger;
      case 'ROLLED_BACK':
        return asciiColors.muted;
      default:
        return asciiColors.foreground;
    }
  };

  const getHashDisplay = (hash: string | null) => {
    if (!hash) return 'N/A (Genesis)';
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
  };

  return (
    <AsciiPanel>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `2px solid ${asciiColors.border}`
      }}>
        <h2 style={{
          fontSize: 16,
          fontWeight: 700,
          color: asciiColors.accent,
          margin: 0,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockFull} MIGRATION CHAIN (BLOCKCHAIN)
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            style={{
              padding: '6px 12px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              fontFamily: 'Consolas',
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="qa">QA</option>
            <option value="production">Production</option>
          </select>
          <button
            onClick={validateChain}
            disabled={validating}
            style={{
              padding: '6px 12px',
              border: `1px solid ${asciiColors.accent}`,
              borderRadius: 2,
              background: asciiColors.accent,
              color: asciiColors.background,
              cursor: validating ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontFamily: 'Consolas',
              fontWeight: 600,
              opacity: validating ? 0.5 : 1
            }}
          >
            {validating ? 'VALIDATING...' : 'VALIDATE CHAIN'}
          </button>
          <button
            onClick={fetchChain}
            disabled={loading}
            style={{
              padding: '6px 12px',
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2,
              background: asciiColors.backgroundSoft,
              color: asciiColors.foreground,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontFamily: 'Consolas',
              fontWeight: 600,
              opacity: loading ? 0.5 : 1
            }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {chainStatus && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          background: chainStatus.valid ? asciiColors.success + '20' : asciiColors.danger + '20',
          border: `1px solid ${chainStatus.valid ? asciiColors.success : asciiColors.danger}`,
          borderRadius: 2,
          fontSize: 11,
          fontFamily: 'Consolas'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <span style={{
              fontWeight: 600,
              color: chainStatus.valid ? asciiColors.success : asciiColors.danger
            }}>
              {chainStatus.valid ? '✓ CHAIN VALID' : '✗ CHAIN BROKEN'}
            </span>
            <span style={{ color: asciiColors.muted }}>
              Total Links: {chainStatus.total_links} | Environment: {chainStatus.environment}
            </span>
          </div>
          {!chainStatus.valid && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: asciiColors.danger, marginBottom: 4 }}>
                Broken at: {chainStatus.broken_at || 'Unknown'}
              </div>
              {chainStatus.missing.length > 0 && (
                <div style={{ color: asciiColors.danger }}>
                  Missing migrations: {chainStatus.missing.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          background: asciiColors.danger + '20',
          border: `1px solid ${asciiColors.danger}`,
          borderRadius: 2,
          color: asciiColors.danger,
          fontSize: 11,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockFull} ERROR: {error}
        </div>
      )}

      {loading ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockSemi} Loading chain...
        </div>
      ) : chainLinks.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: 'Consolas'
        }}>
          {ascii.blockSemi} No migrations in chain for {selectedEnvironment}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {chainLinks.map((link, index) => {
            const isBroken = index > 0 && link.prev_hash !== chainLinks[index - 1].current_hash;
            return (
              <div
                key={link.migration_name}
                style={{
                  padding: 16,
                  border: `2px solid ${isBroken ? asciiColors.danger : asciiColors.border}`,
                  borderRadius: 2,
                  background: isBroken ? asciiColors.danger + '10' : asciiColors.backgroundSoft,
                  position: 'relative'
                }}
              >
                {isBroken && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '4px 8px',
                    background: asciiColors.danger,
                    color: asciiColors.background,
                    fontSize: 10,
                    fontWeight: 600,
                    borderRadius: 2,
                    fontFamily: 'Consolas'
                  }}>
                    ⚠ CHAIN BROKEN
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: asciiColors.foreground,
                      fontFamily: 'Consolas',
                      marginBottom: 4
                    }}>
                      #{link.chain_position} {link.migration_name}
                      {link.is_genesis && (
                        <span style={{
                          marginLeft: 8,
                          padding: '2px 6px',
                          background: asciiColors.accent,
                          color: asciiColors.background,
                          fontSize: 9,
                          borderRadius: 2
                        }}>
                          GENESIS
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: asciiColors.muted,
                      fontFamily: 'Consolas'
                    }}>
                      Version: {link.version}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: 2,
                    fontSize: 10,
                    fontWeight: 600,
                    background: getStatusColor(link.status) + '40',
                    color: getStatusColor(link.status),
                    fontFamily: 'Consolas',
                    border: `1px solid ${getStatusColor(link.status)}`
                  }}>
                    {link.status}
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  fontSize: 10,
                  fontFamily: 'Consolas'
                }}>
                  <div>
                    <div style={{ color: asciiColors.muted, marginBottom: 2 }}>
                      Previous Hash:
                    </div>
                    <div style={{
                      color: asciiColors.foreground,
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: 9
                    }}>
                      {getHashDisplay(link.prev_hash)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: asciiColors.muted, marginBottom: 2 }}>
                      Current Hash:
                    </div>
                    <div style={{
                      color: asciiColors.foreground,
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: 9
                    }}>
                      {getHashDisplay(link.current_hash)}
                    </div>
                  </div>
                </div>
                {index < chainLinks.length - 1 && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: 12,
                    color: isBroken ? asciiColors.danger : asciiColors.muted,
                    fontSize: 16,
                    fontFamily: 'Consolas'
                  }}>
                    {isBroken ? '✗' : '↓'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AsciiPanel>
  );
};

export default MigrationChainView;

