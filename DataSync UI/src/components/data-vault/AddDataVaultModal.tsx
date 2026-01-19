import React, { useState, useCallback, useEffect } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import { dataVaultApi, type DataVaultEntry, type HubTable, type LinkTable, type SatelliteTable, type PointInTimeTable, type BridgeTable } from '../../services/api';
import { extractApiError } from '../../utils/errorHandler';

interface AddDataVaultModalProps {
  onClose: () => void;
  onSave: () => void;
  vault?: DataVaultEntry | null;
}

const connectionStringExamples: Record<string, string> = {
  MariaDB: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=3306',
  MSSQL: 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost,1433;DATABASE=mydatabase;UID=myuser;PWD=mypassword',
  Oracle: 'host=localhost;user=myuser;password=mypassword;db=mydatabase;port=1521',
  PostgreSQL: 'postgresql://myuser:mypassword@localhost:5432/mydatabase',
  MongoDB: 'mongodb://myuser:mypassword@localhost:27017/mydatabase',
  Snowflake: 'DRIVER={Snowflake Driver};SERVER=myaccount.snowflakecomputing.com;UID=myuser;PWD=mypassword;WAREHOUSE=mywarehouse;DATABASE=mydatabase;SCHEMA=myschema',
  BigQuery: JSON.stringify({
    project_id: 'my-project-id',
    dataset_id: 'my_dataset',
    access_token: 'ya29.xxx...'
  }, null, 2),
  Redshift: 'postgresql://myuser:mypassword@mycluster.region.redshift.amazonaws.com:5439/mydatabase',
};

const AddDataVaultModal: React.FC<AddDataVaultModalProps> = ({ onClose, onSave, vault }) => {
  const defaultSourceEngine = vault?.source_db_engine || 'PostgreSQL';
  const defaultTargetEngine = vault?.target_db_engine || 'PostgreSQL';
  
  const [formData, setFormData] = useState({
    vault_name: vault?.vault_name || '',
    description: vault?.description || '',
    source_db_engine: defaultSourceEngine,
    source_connection_string: vault?.source_connection_string || connectionStringExamples[defaultSourceEngine] || '',
    target_db_engine: defaultTargetEngine,
    target_connection_string: vault?.target_connection_string || connectionStringExamples[defaultTargetEngine] || '',
    target_schema: vault?.target_schema || '',
    schedule_cron: vault?.schedule_cron || '',
    active: vault?.active !== undefined ? vault.active : true,
    enabled: vault?.enabled !== undefined ? vault.enabled : true,
    metadata: vault?.metadata || {},
  });

  const [hubs, setHubs] = useState<HubTable[]>(vault?.hubs || []);
  const [links, setLinks] = useState<LinkTable[]>(vault?.links || []);
  const [satellites, setSatellites] = useState<SatelliteTable[]>(vault?.satellites || []);
  const [pointInTimeTables, setPointInTimeTables] = useState<PointInTimeTable[]>(vault?.point_in_time_tables || []);
  const [bridgeTables, setBridgeTables] = useState<BridgeTable[]>(vault?.bridge_tables || []);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'hubs' | 'links' | 'satellites' | 'pit' | 'bridge'>('basic');

  const handleAddHub = useCallback(() => {
    const newHub: HubTable = {
      hub_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      source_query: '',
      business_keys: [],
      hub_key_column: 'hub_key',
      load_date_column: 'load_date',
      record_source_column: 'record_source',
      index_columns: [],
    };
    setHubs([...hubs, newHub]);
  }, [hubs, formData.target_schema]);

  const handleUpdateHub = useCallback((index: number, field: keyof HubTable, value: any) => {
    setHubs(prev => {
      const updated = [...prev];
      if (field === 'business_keys' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveHub = useCallback((index: number) => {
    setHubs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddLink = useCallback(() => {
    const newLink: LinkTable = {
      link_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      source_query: '',
      hub_references: [],
      link_key_column: 'link_key',
      load_date_column: 'load_date',
      record_source_column: 'record_source',
      index_columns: [],
    };
    setLinks([...links, newLink]);
  }, [links, formData.target_schema]);

  const handleUpdateLink = useCallback((index: number, field: keyof LinkTable, value: any) => {
    setLinks(prev => {
      const updated = [...prev];
      if (field === 'hub_references' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveLink = useCallback((index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddSatellite = useCallback(() => {
    const newSatellite: SatelliteTable = {
      satellite_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      parent_hub_name: '',
      parent_link_name: '',
      source_query: '',
      parent_key_column: 'parent_key',
      load_date_column: 'load_date',
      load_end_date_column: 'load_end_date',
      record_source_column: 'record_source',
      descriptive_attributes: [],
      index_columns: [],
      is_historized: true,
    };
    setSatellites([...satellites, newSatellite]);
  }, [satellites, formData.target_schema]);

  const handleUpdateSatellite = useCallback((index: number, field: keyof SatelliteTable, value: any) => {
    setSatellites(prev => {
      const updated = [...prev];
      if (field === 'descriptive_attributes' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveSatellite = useCallback((index: number) => {
    setSatellites(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddPointInTime = useCallback(() => {
    const newPIT: PointInTimeTable = {
      pit_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      hub_name: '',
      satellite_names: [],
      snapshot_date_column: 'snapshot_date',
      index_columns: [],
    };
    setPointInTimeTables([...pointInTimeTables, newPIT]);
  }, [pointInTimeTables, formData.target_schema]);

  const handleUpdatePointInTime = useCallback((index: number, field: keyof PointInTimeTable, value: any) => {
    setPointInTimeTables(prev => {
      const updated = [...prev];
      if (field === 'satellite_names' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemovePointInTime = useCallback((index: number) => {
    setPointInTimeTables(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddBridge = useCallback(() => {
    const newBridge: BridgeTable = {
      bridge_name: '',
      target_schema: formData.target_schema || '',
      target_table: '',
      hub_name: '',
      link_names: [],
      snapshot_date_column: 'snapshot_date',
      index_columns: [],
    };
    setBridgeTables([...bridgeTables, newBridge]);
  }, [bridgeTables, formData.target_schema]);

  const handleUpdateBridge = useCallback((index: number, field: keyof BridgeTable, value: any) => {
    setBridgeTables(prev => {
      const updated = [...prev];
      if (field === 'link_names' || field === 'index_columns') {
        updated[index] = { ...updated[index], [field]: typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(s => s) : value };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleRemoveBridge = useCallback((index: number) => {
    setBridgeTables(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSaving(true);

    try {
      const vaultData: Omit<DataVaultEntry, 'id' | 'created_at' | 'updated_at' | 'last_build_time' | 'last_build_status'> = {
        vault_name: formData.vault_name,
        description: formData.description || null,
        source_db_engine: formData.source_db_engine,
        source_connection_string: formData.source_connection_string,
        target_db_engine: formData.target_db_engine,
        target_connection_string: formData.target_connection_string,
        target_schema: formData.target_schema,
        hubs,
        links,
        satellites,
        point_in_time_tables: pointInTimeTables,
        bridge_tables: bridgeTables,
        schedule_cron: formData.schedule_cron || null,
        active: formData.active,
        enabled: formData.enabled,
        metadata: formData.metadata,
      };

      if (vault) {
        await dataVaultApi.updateVault(vault.vault_name, vaultData);
      } else {
        await dataVaultApi.createVault(vaultData);
      }

      onSave();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  }, [formData, hubs, links, satellites, pointInTimeTables, bridgeTables, vault, onSave]);

  return (
    <AsciiPanel
      title={vault ? `EDIT VAULT: ${vault.vault_name}` : 'ADD DATA VAULT'}
      onClose={onClose}
      style={{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh', overflow: 'auto' }}
    >
      <div style={{ padding: 16, fontFamily: 'Consolas', fontSize: 12 }}>
        {error && (
          <div style={{
            padding: 12,
            marginBottom: 16,
            backgroundColor: asciiColors.danger + '20',
            border: `1px solid ${asciiColors.danger}`,
            borderRadius: 2,
            color: asciiColors.danger
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: `1px solid ${asciiColors.border}`, paddingBottom: 8 }}>
          {(['basic', 'hubs', 'links', 'satellites', 'pit', 'bridge'] as const).map(tab => (
            <AsciiButton
              key={tab}
              label={tab.charAt(0).toUpperCase() + tab.slice(1)}
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? 'primary' : 'ghost'}
            />
          ))}
        </div>

        {activeTab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Vault Name *
              </label>
              <input
                type="text"
                value={formData.vault_name}
                onChange={(e) => setFormData(prev => ({ ...prev, vault_name: e.target.value }))}
                disabled={!!vault}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: vault ? asciiColors.backgroundSoft : asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                  Source DB Engine *
                </label>
                <select
                  value={formData.source_db_engine}
                  onChange={(e) => {
                    const engine = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      source_db_engine: engine,
                      source_connection_string: connectionStringExamples[engine] || prev.source_connection_string
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MariaDB">MariaDB</option>
                  <option value="MSSQL">MSSQL</option>
                  <option value="MongoDB">MongoDB</option>
                  <option value="Oracle">Oracle</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                  Target DB Engine *
                </label>
                <select
                  value={formData.target_db_engine}
                  onChange={(e) => {
                    const engine = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      target_db_engine: engine,
                      target_connection_string: connectionStringExamples[engine] || prev.target_connection_string
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: `1px solid ${asciiColors.border}`,
                    borderRadius: 2,
                    fontSize: 12,
                    fontFamily: 'Consolas',
                    backgroundColor: asciiColors.background,
                    color: asciiColors.foreground,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="Snowflake">Snowflake</option>
                  <option value="BigQuery">BigQuery</option>
                  <option value="Redshift">Redshift</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Source Connection String *
              </label>
              <textarea
                value={formData.source_connection_string}
                onChange={(e) => setFormData(prev => ({ ...prev, source_connection_string: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Target Connection String *
              </label>
              <textarea
                value={formData.target_connection_string}
                onChange={(e) => setFormData(prev => ({ ...prev, target_connection_string: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Target Schema *
              </label>
              <input
                type="text"
                value={formData.target_schema}
                onChange={(e) => setFormData(prev => ({ ...prev, target_schema: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, color: asciiColors.foreground, fontWeight: 600 }}>
                Schedule Cron (optional)
              </label>
              <input
                type="text"
                value={formData.schedule_cron}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_cron: e.target.value }))}
                placeholder="0 0 * * * (daily at midnight)"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: `1px solid ${asciiColors.border}`,
                  borderRadius: 2,
                  fontSize: 12,
                  fontFamily: 'Consolas',
                  backgroundColor: asciiColors.background,
                  color: asciiColors.foreground,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                />
                <span style={{ color: asciiColors.foreground }}>Active</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <span style={{ color: asciiColors.foreground }}>Enabled</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'hubs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: asciiColors.foreground }}>Hub Tables ({hubs.length})</h3>
              <AsciiButton label="Add Hub" onClick={handleAddHub} variant="primary" />
            </div>
            {hubs.map((hub, index) => (
              <AsciiPanel key={index} title={`Hub ${index + 1}: ${hub.hub_name || 'Unnamed'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Hub Name *</label>
                      <input
                        type="text"
                        value={hub.hub_name}
                        onChange={(e) => handleUpdateHub(index, 'hub_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Target Table *</label>
                      <input
                        type="text"
                        value={hub.target_table}
                        onChange={(e) => handleUpdateHub(index, 'target_table', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Source Query *</label>
                    <textarea
                      value={hub.source_query}
                      onChange={(e) => handleUpdateHub(index, 'source_query', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Business Keys (comma-separated) *</label>
                    <input
                      type="text"
                      value={hub.business_keys.join(', ')}
                      onChange={(e) => handleUpdateHub(index, 'business_keys', e.target.value)}
                      placeholder="customer_id, order_id"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Hub Key Column</label>
                      <input
                        type="text"
                        value={hub.hub_key_column}
                        onChange={(e) => handleUpdateHub(index, 'hub_key_column', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Load Date Column</label>
                      <input
                        type="text"
                        value={hub.load_date_column}
                        onChange={(e) => handleUpdateHub(index, 'load_date_column', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Record Source Column</label>
                      <input
                        type="text"
                        value={hub.record_source_column}
                        onChange={(e) => handleUpdateHub(index, 'record_source_column', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <AsciiButton label="Remove" onClick={() => handleRemoveHub(index)} variant="danger" />
                </div>
              </AsciiPanel>
            ))}
          </div>
        )}

        {activeTab === 'links' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: asciiColors.foreground }}>Link Tables ({links.length})</h3>
              <AsciiButton label="Add Link" onClick={handleAddLink} variant="primary" />
            </div>
            {links.map((link, index) => (
              <AsciiPanel key={index} title={`Link ${index + 1}: ${link.link_name || 'Unnamed'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Link Name *</label>
                      <input
                        type="text"
                        value={link.link_name}
                        onChange={(e) => handleUpdateLink(index, 'link_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Target Table *</label>
                      <input
                        type="text"
                        value={link.target_table}
                        onChange={(e) => handleUpdateLink(index, 'target_table', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Source Query *</label>
                    <textarea
                      value={link.source_query}
                      onChange={(e) => handleUpdateLink(index, 'source_query', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Hub References (comma-separated) *</label>
                    <input
                      type="text"
                      value={link.hub_references.join(', ')}
                      onChange={(e) => handleUpdateLink(index, 'hub_references', e.target.value)}
                      placeholder="customer_hub, order_hub"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <AsciiButton label="Remove" onClick={() => handleRemoveLink(index)} variant="danger" />
                </div>
              </AsciiPanel>
            ))}
          </div>
        )}

        {activeTab === 'satellites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: asciiColors.foreground }}>Satellite Tables ({satellites.length})</h3>
              <AsciiButton label="Add Satellite" onClick={handleAddSatellite} variant="primary" />
            </div>
            {satellites.map((satellite, index) => (
              <AsciiPanel key={index} title={`Satellite ${index + 1}: ${satellite.satellite_name || 'Unnamed'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Satellite Name *</label>
                      <input
                        type="text"
                        value={satellite.satellite_name}
                        onChange={(e) => handleUpdateSatellite(index, 'satellite_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Target Table *</label>
                      <input
                        type="text"
                        value={satellite.target_table}
                        onChange={(e) => handleUpdateSatellite(index, 'target_table', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Parent Hub Name</label>
                      <input
                        type="text"
                        value={satellite.parent_hub_name}
                        onChange={(e) => handleUpdateSatellite(index, 'parent_hub_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Parent Link Name</label>
                      <input
                        type="text"
                        value={satellite.parent_link_name}
                        onChange={(e) => handleUpdateSatellite(index, 'parent_link_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Source Query *</label>
                    <textarea
                      value={satellite.source_query}
                      onChange={(e) => handleUpdateSatellite(index, 'source_query', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Descriptive Attributes (comma-separated)</label>
                    <input
                      type="text"
                      value={satellite.descriptive_attributes.join(', ')}
                      onChange={(e) => handleUpdateSatellite(index, 'descriptive_attributes', e.target.value)}
                      placeholder="name, email, address"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={satellite.is_historized}
                      onChange={(e) => handleUpdateSatellite(index, 'is_historized', e.target.checked)}
                    />
                    <span style={{ fontSize: 11 }}>Historized (track history)</span>
                  </label>
                  <AsciiButton label="Remove" onClick={() => handleRemoveSatellite(index)} variant="danger" />
                </div>
              </AsciiPanel>
            ))}
          </div>
        )}

        {activeTab === 'pit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: asciiColors.foreground }}>Point-in-Time Tables ({pointInTimeTables.length})</h3>
              <AsciiButton label="Add PIT" onClick={handleAddPointInTime} variant="primary" />
            </div>
            {pointInTimeTables.map((pit, index) => (
              <AsciiPanel key={index} title={`PIT ${index + 1}: ${pit.pit_name || 'Unnamed'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>PIT Name *</label>
                      <input
                        type="text"
                        value={pit.pit_name}
                        onChange={(e) => handleUpdatePointInTime(index, 'pit_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Target Table *</label>
                      <input
                        type="text"
                        value={pit.target_table}
                        onChange={(e) => handleUpdatePointInTime(index, 'target_table', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Hub Name *</label>
                    <input
                      type="text"
                      value={pit.hub_name}
                      onChange={(e) => handleUpdatePointInTime(index, 'hub_name', e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Satellite Names (comma-separated) *</label>
                    <input
                      type="text"
                      value={pit.satellite_names.join(', ')}
                      onChange={(e) => handleUpdatePointInTime(index, 'satellite_names', e.target.value)}
                      placeholder="customer_sat, order_sat"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <AsciiButton label="Remove" onClick={() => handleRemovePointInTime(index)} variant="danger" />
                </div>
              </AsciiPanel>
            ))}
          </div>
        )}

        {activeTab === 'bridge' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: asciiColors.foreground }}>Bridge Tables ({bridgeTables.length})</h3>
              <AsciiButton label="Add Bridge" onClick={handleAddBridge} variant="primary" />
            </div>
            {bridgeTables.map((bridge, index) => (
              <AsciiPanel key={index} title={`Bridge ${index + 1}: ${bridge.bridge_name || 'Unnamed'}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Bridge Name *</label>
                      <input
                        type="text"
                        value={bridge.bridge_name}
                        onChange={(e) => handleUpdateBridge(index, 'bridge_name', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Target Table *</label>
                      <input
                        type="text"
                        value={bridge.target_table}
                        onChange={(e) => handleUpdateBridge(index, 'target_table', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Hub Name *</label>
                    <input
                      type="text"
                      value={bridge.hub_name}
                      onChange={(e) => handleUpdateBridge(index, 'hub_name', e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>Link Names (comma-separated) *</label>
                    <input
                      type="text"
                      value={bridge.link_names.join(', ')}
                      onChange={(e) => handleUpdateBridge(index, 'link_names', e.target.value)}
                      placeholder="customer_order_link, order_item_link"
                      style={{ width: '100%', padding: '4px 8px', fontSize: 11, fontFamily: 'Consolas' }}
                    />
                  </div>
                  <AsciiButton label="Remove" onClick={() => handleRemoveBridge(index)} variant="danger" />
                </div>
              </AsciiPanel>
            ))}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <AsciiButton
            label="Cancel"
            onClick={onClose}
            variant="ghost"
          />
          <AsciiButton
            label={isSaving ? 'Saving...' : (vault ? 'Update' : 'Create')}
            onClick={handleSubmit}
            variant="primary"
            disabled={isSaving}
          />
        </div>
      </div>
    </AsciiPanel>
  );
};

export default AddDataVaultModal;
