import React, { useState, useEffect } from 'react';
import { securityApi } from '../../services/api';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors } from '../../ui/theme/asciiTheme';
import { theme } from '../../theme/theme';
import { extractApiError } from '../../utils/errorHandler';

interface AnonymizationProfile {
  profile_id?: number;
  profile_name: string;
  schema_name: string;
  table_name: string;
  anonymization_type: string;
  k_value?: number;
  l_value?: number;
  t_value?: number;
  epsilon?: number;
  quasi_identifiers: string[];
  sensitive_attributes?: string[];
  generalization_levels?: Record<string, number>;
  suppression_threshold?: number;
  active: boolean;
}

const Anonymization = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AnonymizationProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AnonymizationProfile | null>(null);
  const [profileForm, setProfileForm] = useState<AnonymizationProfile>({
    profile_name: '',
    schema_name: '',
    table_name: '',
    anonymization_type: 'K_ANONYMITY',
    k_value: 2,
    l_value: 2,
    t_value: 0.1,
    epsilon: 1.0,
    quasi_identifiers: [],
    sensitive_attributes: [],
    suppression_threshold: 0.0,
    active: true
  });
  const [quasiIdInput, setQuasiIdInput] = useState('');
  const [sensitiveAttrInput, setSensitiveAttrInput] = useState('');

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getAnonymizationProfiles();
      setProfiles(data);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleCreateProfile = async () => {
    if (!profileForm.profile_name || !profileForm.schema_name || !profileForm.table_name || !profileForm.quasi_identifiers.length) {
      setError('Profile name, schema, table, and at least one quasi-identifier are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await securityApi.createAnonymizationProfile(profileForm);
      setProfileForm({
        profile_name: '',
        schema_name: '',
        table_name: '',
        anonymization_type: 'K_ANONYMITY',
        k_value: 2,
        l_value: 2,
        t_value: 0.1,
        epsilon: 1.0,
        quasi_identifiers: [],
        sensitive_attributes: [],
        suppression_threshold: 0.0,
        active: true
      });
      setQuasiIdInput('');
      setSensitiveAttrInput('');
      loadProfiles();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const addQuasiIdentifier = () => {
    if (quasiIdInput.trim()) {
      setProfileForm({
        ...profileForm,
        quasi_identifiers: [...profileForm.quasi_identifiers, quasiIdInput.trim()]
      });
      setQuasiIdInput('');
    }
  };

  const removeQuasiIdentifier = (index: number) => {
    setProfileForm({
      ...profileForm,
      quasi_identifiers: profileForm.quasi_identifiers.filter((_, i) => i !== index)
    });
  };

  const addSensitiveAttribute = () => {
    if (sensitiveAttrInput.trim()) {
      setProfileForm({
        ...profileForm,
        sensitive_attributes: [...(profileForm.sensitive_attributes || []), sensitiveAttrInput.trim()]
      });
      setSensitiveAttrInput('');
    }
  };

  const removeSensitiveAttribute = (index: number) => {
    setProfileForm({
      ...profileForm,
      sensitive_attributes: profileForm.sensitive_attributes?.filter((_, i) => i !== index) || []
    });
  };

  return (
    <div>
      {error && (
        <div style={{
          padding: theme.spacing.md,
          background: asciiColors.error,
          color: '#ffffff',
          marginBottom: theme.spacing.md,
          borderRadius: 2,
          fontSize: 12
        }}>
          {error}
        </div>
      )}

      {/* Create Profile Form */}
      <AsciiPanel style={{ marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Create Anonymization Profile
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Profile Name
            </label>
            <input
              type="text"
              value={profileForm.profile_name}
              onChange={(e) => setProfileForm({ ...profileForm, profile_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Anonymization Type
            </label>
            <select
              value={profileForm.anonymization_type}
              onChange={(e) => setProfileForm({ ...profileForm, anonymization_type: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            >
              <option value="K_ANONYMITY">K-Anonymity</option>
              <option value="L_DIVERSITY">L-Diversity</option>
              <option value="T_CLOSENESS">T-Closeness</option>
              <option value="DIFFERENTIAL_PRIVACY">Differential Privacy</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Schema Name
            </label>
            <input
              type="text"
              value={profileForm.schema_name}
              onChange={(e) => setProfileForm({ ...profileForm, schema_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Table Name
            </label>
            <input
              type="text"
              value={profileForm.table_name}
              onChange={(e) => setProfileForm({ ...profileForm, table_name: e.target.value })}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
          </div>
          {profileForm.anonymization_type === 'K_ANONYMITY' && (
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                K Value
              </label>
              <input
                type="number"
                min="2"
                value={profileForm.k_value || 2}
                onChange={(e) => setProfileForm({ ...profileForm, k_value: parseInt(e.target.value) || 2 })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  background: asciiColors.background,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
              />
            </div>
          )}
          {profileForm.anonymization_type === 'L_DIVERSITY' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                  K Value
                </label>
                <input
                  type="number"
                  min="2"
                  value={profileForm.k_value || 2}
                  onChange={(e) => setProfileForm({ ...profileForm, k_value: parseInt(e.target.value) || 2 })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    background: asciiColors.background,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                  L Value
                </label>
                <input
                  type="number"
                  min="2"
                  value={profileForm.l_value || 2}
                  onChange={(e) => setProfileForm({ ...profileForm, l_value: parseInt(e.target.value) || 2 })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    background: asciiColors.background,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
            </>
          )}
          {profileForm.anonymization_type === 'T_CLOSENESS' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                  K Value
                </label>
                <input
                  type="number"
                  min="2"
                  value={profileForm.k_value || 2}
                  onChange={(e) => setProfileForm({ ...profileForm, k_value: parseInt(e.target.value) || 2 })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    background: asciiColors.background,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                  T Value
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={profileForm.t_value || 0.1}
                  onChange={(e) => setProfileForm({ ...profileForm, t_value: parseFloat(e.target.value) || 0.1 })}
                  style={{
                    width: '100%',
                    padding: theme.spacing.sm,
                    background: asciiColors.background,
                    border: `1px solid ${asciiColors.border}`,
                    color: asciiColors.foreground,
                    fontFamily: 'Consolas, monospace',
                    fontSize: 12
                  }}
                />
              </div>
            </>
          )}
          {profileForm.anonymization_type === 'DIFFERENTIAL_PRIVACY' && (
            <div>
              <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
                Epsilon (Privacy Budget)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={profileForm.epsilon || 1.0}
                onChange={(e) => setProfileForm({ ...profileForm, epsilon: parseFloat(e.target.value) || 1.0 })}
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  background: asciiColors.background,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
            Quasi-Identifiers (comma-separated or add one by one)
          </label>
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <input
              type="text"
              value={quasiIdInput}
              onChange={(e) => setQuasiIdInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuasiIdentifier()}
              placeholder="Enter quasi-identifier"
              style={{
                flex: 1,
                padding: theme.spacing.sm,
                background: asciiColors.background,
                border: `1px solid ${asciiColors.border}`,
                color: asciiColors.foreground,
                fontFamily: 'Consolas, monospace',
                fontSize: 12
              }}
            />
            <AsciiButton onClick={addQuasiIdentifier}>Add</AsciiButton>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {profileForm.quasi_identifiers.map((qi, index) => (
              <span
                key={index}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  background: asciiColors.backgroundSoft,
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                {qi}
                <button
                  onClick={() => removeQuasiIdentifier(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: asciiColors.error,
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 0,
                    width: 16,
                    height: 16
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {(profileForm.anonymization_type === 'L_DIVERSITY' || profileForm.anonymization_type === 'T_CLOSENESS') && (
          <div style={{ marginBottom: theme.spacing.md }}>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: 12, color: asciiColors.muted }}>
              Sensitive Attributes
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <input
                type="text"
                value={sensitiveAttrInput}
                onChange={(e) => setSensitiveAttrInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSensitiveAttribute()}
                placeholder="Enter sensitive attribute"
                style={{
                  flex: 1,
                  padding: theme.spacing.sm,
                  background: asciiColors.background,
                  border: `1px solid ${asciiColors.border}`,
                  color: asciiColors.foreground,
                  fontFamily: 'Consolas, monospace',
                  fontSize: 12
                }}
              />
              <AsciiButton onClick={addSensitiveAttribute}>Add</AsciiButton>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {profileForm.sensitive_attributes?.map((attr, index) => (
                <span
                  key={index}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    background: asciiColors.backgroundSoft,
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  {attr}
                  <button
                    onClick={() => removeSensitiveAttribute(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: asciiColors.error,
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: 0,
                      width: 16,
                      height: 16
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <AsciiButton onClick={handleCreateProfile} disabled={loading}>
          Create Profile
        </AsciiButton>
      </AsciiPanel>

      {/* Profiles List */}
      <AsciiPanel>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: theme.spacing.md, color: asciiColors.foreground }}>
          Anonymization Profiles ({profiles.length})
        </h2>
        {loading ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            Loading...
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: asciiColors.muted }}>
            No profiles found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${asciiColors.border}` }}>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Profile Name</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Schema</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Table</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Type</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>K</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>L</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>T/Epsilon</th>
                <th style={{ padding: theme.spacing.sm, textAlign: 'left', color: asciiColors.accent }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr
                  key={profile.profile_id}
                  style={{ borderBottom: `1px solid ${asciiColors.border}`, cursor: 'pointer' }}
                  onClick={() => setSelectedProfile(profile)}
                >
                  <td style={{ padding: theme.spacing.sm }}>{profile.profile_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{profile.schema_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{profile.table_name}</td>
                  <td style={{ padding: theme.spacing.sm }}>{profile.anonymization_type}</td>
                  <td style={{ padding: theme.spacing.sm }}>{profile.k_value || '-'}</td>
                  <td style={{ padding: theme.spacing.sm }}>{profile.l_value || '-'}</td>
                  <td style={{ padding: theme.spacing.sm }}>
                    {profile.t_value !== undefined ? profile.t_value : profile.epsilon !== undefined ? profile.epsilon : '-'}
                  </td>
                  <td style={{ padding: theme.spacing.sm }}>
                    <span style={{ color: profile.active ? asciiColors.accent : asciiColors.muted }}>
                      {profile.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsciiPanel>
    </div>
  );
};

export default Anonymization;
