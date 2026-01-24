import React, { useState, useEffect, useCallback } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { datalakeApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';
import SkeletonLoader from '../shared/SkeletonLoader';

interface UnusedObject {
  object_type: string;
  schema_name: string;
  object_name: string;
  days_since_last_access: number;
  dependencies: string[];
  recommendations: string[];
}

interface Report {
  report_id: number;
  generated_at: string;
  days_threshold: number;
  total_unused_count: number;
  unused_objects: UnusedObject[];
}

const UnusedObjects = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState<number>(90);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await datalakeApi.getUnusedObjectsReports({});
      setReports(data.reports || data || []);
      if (data.reports && data.reports.length > 0) {
        setCurrentReport(data.reports[0]);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDetect = useCallback(async () => {
    try {
      setDetecting(true);
      setError(null);
      const data = await datalakeApi.detectUnusedObjects({ days_threshold: daysThreshold });
      if (data.success) {
        await fetchReports();
        // Load the new report
        if (data.report_id) {
          const reportData = await datalakeApi.getUnusedObjectsReport(data.report_id);
          setCurrentReport(reportData.report || reportData);
        }
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setDetecting(false);
    }
  }, [daysThreshold, fetchReports]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <AsciiPanel>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <h1 style={{ 
            fontSize: 18, 
            fontWeight: 600, 
            color: asciiColors.foreground,
            marginBottom: theme.spacing.md 
          }}>
            Unused Objects Detector
          </h1>
          <p style={{ 
            color: asciiColors.muted, 
            fontSize: 12,
            marginBottom: theme.spacing.lg 
          }}>
            Detect and report unused database objects
          </p>

          {/* Detection Controls */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <label style={{ color: asciiColors.foreground, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
              Days Threshold:
              <input
                type="number"
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(parseInt(e.target.value) || 90)}
                min={1}
                style={{
                  marginLeft: theme.spacing.sm,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  border: `1px solid ${asciiColors.border}`,
                  background: asciiColors.background,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12,
                  borderRadius: 2,
                  width: 80
                }}
              />
            </label>
            <AsciiButton
              onClick={handleDetect}
              label={detecting ? "Detecting..." : "Detect Unused Objects"}
              disabled={detecting}
            />
          </div>

          {error && (
            <div style={{
              padding: theme.spacing.md,
              background: asciiColors.error,
              color: '#ffffff',
              marginBottom: theme.spacing.md,
              borderRadius: 2,
              fontFamily: 'Consolas, monospace',
              fontSize: 12
            }}>
              Error: {error}
            </div>
          )}

          {loading ? (
            <SkeletonLoader />
          ) : currentReport ? (
            <div>
              <div style={{
                padding: theme.spacing.md,
                background: asciiColors.backgroundSoft,
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                marginBottom: theme.spacing.md
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: theme.spacing.xs }}>
                      Report #{currentReport.report_id}
                    </div>
                    <div style={{ fontSize: 11, color: asciiColors.muted }}>
                      Generated: {formatDate(currentReport.generated_at)} | 
                      Threshold: {currentReport.days_threshold} days | 
                      Total: {currentReport.total_unused_count} objects
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}>
                  <thead>
                    <tr style={{
                      background: asciiColors.backgroundSoft,
                      borderBottom: `2px solid ${asciiColors.border}`
                    }}>
                      <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Object</th>
                      <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Days Unused</th>
                      <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Dependencies</th>
                      <th style={{ padding: theme.spacing.md, textAlign: 'left', fontWeight: 600 }}>Recommendations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReport.unused_objects.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
                          No unused objects found
                        </td>
                      </tr>
                    ) : (
                      currentReport.unused_objects.map((obj, idx) => (
                        <tr
                          key={`${obj.schema_name}.${obj.object_name}`}
                          style={{
                            borderBottom: `1px solid ${asciiColors.border}`,
                            background: idx % 2 === 0 ? asciiColors.background : asciiColors.backgroundSoft
                          }}
                        >
                          <td style={{ padding: theme.spacing.md }}>
                            {obj.schema_name}.{obj.object_name}
                          </td>
                          <td style={{ padding: theme.spacing.md }}>
                            <span style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              background: asciiColors.muted,
                              color: '#ffffff',
                              borderRadius: 2,
                              fontSize: 11
                            }}>
                              {obj.object_type}
                            </span>
                          </td>
                          <td style={{ padding: theme.spacing.md }}>{obj.days_since_last_access}</td>
                          <td style={{ padding: theme.spacing.md, color: asciiColors.muted }}>
                            {obj.dependencies.length > 0 ? obj.dependencies.length : 'None'}
                          </td>
                          <td style={{ padding: theme.spacing.md, fontSize: 11, color: asciiColors.muted }}>
                            {obj.recommendations.length > 0 ? obj.recommendations[0] : 'No recommendations'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              padding: theme.spacing.lg,
              textAlign: 'center',
              color: asciiColors.muted,
              border: `1px solid ${asciiColors.border}`,
              borderRadius: 2
            }}>
              No reports available. Click "Detect Unused Objects" to generate a new report.
            </div>
          )}
        </div>
      </AsciiPanel>
    </div>
  );
};

export default UnusedObjects;
