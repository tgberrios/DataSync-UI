import React, { useState } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { workflowApi } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface BackfillModalProps {
  workflowName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const BackfillModal: React.FC<BackfillModalProps> = ({ workflowName, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    date_field: '',
    interval: 'daily' as 'daily' | 'weekly' | 'monthly',
    parallel: false,
    max_parallel_jobs: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.start_date || !formData.end_date) {
      setError('Start date and end date are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await workflowApi.executeBackfill(workflowName, formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AsciiPanel
      title={`BACKFILL: ${workflowName}`}
      onClose={onClose}
      style={{ width: '600px', maxWidth: '90vw' }}
    >
      <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: asciiColors.danger + '20',
            border: `1px solid ${asciiColors.danger}`,
            color: asciiColors.danger,
            borderRadius: 2,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
              Date Field
            </label>
            <input
              type="text"
              value={formData.date_field}
              onChange={(e) => setFormData({ ...formData, date_field: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                outline: 'none',
              }}
              placeholder="date_column"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
              Interval
            </label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                fontSize: 12,
                fontFamily: 'Consolas',
                backgroundColor: asciiColors.background,
                color: asciiColors.foreground,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.parallel}
              onChange={(e) => setFormData({ ...formData, parallel: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: asciiColors.foreground }}>Parallel Execution</span>
          </label>

          {formData.parallel && (
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: asciiColors.foreground, fontWeight: 600 }}>
                Max Parallel Jobs
              </label>
              <input
                type="number"
                value={formData.max_parallel_jobs}
                onChange={(e) => setFormData({ ...formData, max_parallel_jobs: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                style={{
                  width: 150,
                  padding: '8px 12px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: `1px solid ${asciiColors.border}`, paddingTop: 16 }}>
            <AsciiButton
              label="Cancel"
              onClick={onClose}
              variant="ghost"
              disabled={isSubmitting}
            />
            <AsciiButton
              label={isSubmitting ? "Starting..." : "Start Backfill"}
              onClick={handleSubmit}
              variant="primary"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </AsciiPanel>
  );
};

export default BackfillModal;
