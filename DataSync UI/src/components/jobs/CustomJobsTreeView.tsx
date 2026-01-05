import React, { useState, useMemo } from 'react';
import { AsciiPanel } from '../../ui/layout/AsciiPanel';
import { AsciiButton } from '../../ui/controls/AsciiButton';
import { asciiColors, ascii } from '../../ui/theme/asciiTheme';
import type { CustomJobEntry } from '../../services/api';


interface SchemaNode {
  name: string;
  tables: Map<string, TableNode>;
}

interface TableNode {
  name: string;
  jobs: CustomJobEntry[];
}

interface TreeViewProps {
  jobs: CustomJobEntry[];
  onJobClick?: (job: CustomJobEntry) => void;
  onJobEdit?: (job: CustomJobEntry) => void;
  onJobExecute?: (jobName: string) => void;
  onJobToggleActive?: (jobName: string, currentActive: boolean) => void;
  onJobDelete?: (jobName: string) => void;
  onJobDuplicate?: (job: CustomJobEntry) => void;
  onJobReboot?: (jobName: string) => void;
}

const CustomJobsTreeView: React.FC<TreeViewProps> = ({ 
  jobs, 
  onJobClick, 
  onJobEdit, 
  onJobExecute, 
  onJobToggleActive, 
  onJobDelete,
  onJobDuplicate,
  onJobReboot
}) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const schemas = new Map<string, SchemaNode>();

    jobs.forEach(job => {
      const schemaName = job.target_schema || 'Other';
      const tableName = job.target_table || 'Other';

      if (!schemas.has(schemaName)) {
        schemas.set(schemaName, {
          name: schemaName,
          tables: new Map()
        });
      }

      const schema = schemas.get(schemaName)!;

      if (!schema.tables.has(tableName)) {
        schema.tables.set(tableName, {
          name: tableName,
          jobs: []
        });
      }

      schema.tables.get(tableName)!.jobs.push(job);
    });

    return Array.from(schemas.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [jobs]);

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(schemaName)) {
        next.delete(schemaName);
        const schema = treeData.find(s => s.name === schemaName);
        if (schema) {
          schema.tables.forEach(table => {
            const key = `${schemaName}.${table.name}`;
            setExpandedTables(prevTables => {
              const nextTables = new Set(prevTables);
              nextTables.delete(key);
              return nextTables;
            });
          });
        }
      } else {
        next.add(schemaName);
      }
      return next;
    });
  };

  const toggleTable = (schemaName: string, tableName: string) => {
    const key = `${schemaName}.${tableName}`;
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderTreeLine = (level: number, isLast: boolean) => {
    if (level === 0) return null;
    
    const lines: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      lines.push('│  ');
    }
    lines.push(isLast ? '└── ' : '├── ');
    return (
      <span style={{
        color: asciiColors.muted,
        marginRight: 6,
        fontFamily: "Consolas",
        fontSize: 11
      }}>
        {lines.join('')}
      </span>
    );
  };

  const renderSchema = (schema: SchemaNode, level: number, isLast: boolean) => {
    const isExpanded = expandedSchemas.has(schema.name);
    const totalJobs = Array.from(schema.tables.values()).reduce((sum, table) => sum + table.jobs.length, 0);

    return (
      <div key={schema.name} style={{ marginBottom: 2, userSelect: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            position: 'relative',
            margin: '2px 0',
            background: `linear-gradient(135deg, ${asciiColors.accentSoft}15 0%, ${asciiColors.accent}08 100%)`,
            borderLeft: `3px solid ${asciiColors.accent}`,
            fontFamily: "Consolas",
            fontSize: 12
          }}
          onClick={() => toggleSchema(schema.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${asciiColors.accentSoft}25 0%, ${asciiColors.accent}15 100%)`;
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${asciiColors.accentSoft}15 0%, ${asciiColors.accent}08 100%)`;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLast)}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            marginRight: 8,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
            {ascii.blockFull}
          </span>
          <span style={{
            fontWeight: 600,
            color: asciiColors.accent,
            marginRight: 8,
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {schema.name}
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            border: `1px solid ${asciiColors.border}`
          }}>
            {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'}
          </span>
        </div>
        {isExpanded && (
          <div style={{
            overflow: 'hidden',
            paddingLeft: `${(level + 1) * 24 + 36}px`
          }}>
            {Array.from(schema.tables.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((table, index, arr) => 
                renderTable(table, schema.name, level + 1, index === arr.length - 1)
              )}
          </div>
        )}
      </div>
    );
  };

  const renderTable = (table: TableNode, schemaName: string, level: number, isLast: boolean) => {
    const key = `${schemaName}.${table.name}`;
    const isExpanded = expandedTables.has(key);

    return (
      <div key={key} style={{ marginBottom: 2, userSelect: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 8px',
            paddingLeft: `${level * 24 + 8}px`,
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            position: 'relative',
            margin: '2px 0',
            background: asciiColors.backgroundSoft,
            borderLeft: `2px solid ${asciiColors.border}`,
            fontFamily: "Consolas",
            fontSize: 12
          }}
          onClick={() => toggleTable(schemaName, table.name)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.background;
            e.currentTarget.style.transform = 'translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          {renderTreeLine(level, isLast)}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            marginRight: 8,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
            {ascii.blockSemi}
          </span>
          <span style={{
            fontWeight: 500,
            color: asciiColors.foreground,
            marginRight: 8,
            flex: 1,
            fontFamily: "Consolas",
            fontSize: 12
          }}>
            {table.name}
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            border: `1px solid ${asciiColors.border}`
          }}>
            {table.jobs.length} {table.jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        </div>
        {isExpanded && (
          <div style={{
            overflow: 'hidden',
            paddingLeft: `${(level + 1) * 24 + 36}px`
          }}>
            {table.jobs.map((job, index) => 
              renderJob(job, level + 1, index === table.jobs.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderJob = (job: CustomJobEntry, level: number, isLast: boolean) => {
    return (
      <div
        key={job.id}
        style={{
          padding: '12px 8px',
          paddingLeft: `${level * 24 + 36}px`,
          margin: '2px 0',
          borderRadius: 2,
          background: asciiColors.background,
          border: `1px solid ${asciiColors.border}`,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: "Consolas",
          fontSize: 12
        }}
        onClick={() => onJobClick?.(job)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = asciiColors.backgroundSoft;
          e.currentTarget.style.borderColor = asciiColors.accent;
          e.currentTarget.style.transform = 'translateX(4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = asciiColors.background;
          e.currentTarget.style.borderColor = asciiColors.border;
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        {renderTreeLine(level, isLast)}
        <span style={{ marginRight: 8, color: asciiColors.accent, fontFamily: "Consolas" }}>
          {ascii.dot}
        </span>
        <span style={{ marginRight: 8, fontWeight: 500, color: asciiColors.foreground, flex: 1, fontFamily: "Consolas", fontSize: 12 }}>
          {job.job_name}
        </span>
        {job.description && (
          <span style={{ color: asciiColors.muted, fontSize: 11, flex: 1, fontFamily: "Consolas" }}>
            {job.description.length > 50 ? job.description.substring(0, 50) + '...' : job.description}
          </span>
        )}
        <span style={{ color: asciiColors.muted, fontSize: 11, fontFamily: "Consolas" }}>
          {job.source_db_engine} → {job.target_db_engine}
        </span>
        {job.schedule_cron ? (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: asciiColors.accent,
            color: asciiColors.background,
            fontFamily: "Consolas",
            border: `1px solid ${asciiColors.accent}`
          }}>
            Scheduled: {job.schedule_cron}
          </span>
        ) : (
          <span style={{
            padding: '2px 8px',
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: asciiColors.backgroundSoft,
            color: asciiColors.muted,
            fontFamily: "Consolas",
            border: `1px solid ${asciiColors.border}`
          }}>
            Manual
          </span>
        )}
        <span style={{
          padding: '2px 8px',
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 500,
          backgroundColor: job.active ? asciiColors.success : asciiColors.danger,
          color: asciiColors.background,
          fontFamily: "Consolas",
          border: `1px solid ${job.active ? asciiColors.success : asciiColors.danger}`
        }}>
          {job.active ? 'Active' : 'Inactive'}
        </span>
        <span style={{
          padding: '2px 8px',
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 500,
          backgroundColor: job.enabled ? asciiColors.success : asciiColors.danger,
          color: asciiColors.background,
          fontFamily: "Consolas",
          border: `1px solid ${job.enabled ? asciiColors.success : asciiColors.danger}`
        }}>
          {job.enabled ? 'Enabled' : 'Disabled'}
        </span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {onJobExecute && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobExecute(job.job_name);
              }}
              title={`Execute job: ${job.job_name}`}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.accent}`,
                borderRadius: 2,
                background: asciiColors.accent,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "Consolas",
                fontWeight: 600,
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.accentSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.accent;
              }}
            >
              ▶
            </button>
          )}
          {onJobDuplicate && (
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <AsciiButton
                label="Duplicate"
                onClick={() => onJobDuplicate(job)}
                variant="primary"
              />
            </div>
          )}
          {onJobEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobEdit(job);
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.background,
                color: asciiColors.foreground,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "Consolas",
                fontWeight: 600,
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.background;
              }}
            >
              Edit
            </button>
          )}
          {onJobToggleActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobToggleActive(job.job_name, job.active);
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.border}`,
                borderRadius: 2,
                background: asciiColors.background,
                color: asciiColors.foreground,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "Consolas",
                fontWeight: 600,
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.backgroundSoft;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.background;
              }}
            >
              {job.active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {onJobDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobDelete(job.job_name);
              }}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.danger}`,
                borderRadius: 2,
                background: asciiColors.danger,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "Consolas",
                fontWeight: 600,
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.danger + "CC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.danger;
              }}
            >
              Delete
            </button>
          )}
          {onJobReboot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobReboot(job.job_name);
              }}
              title={`Reboot table: ${job.target_schema}.${job.target_table}`}
              style={{
                padding: '4px 8px',
                border: `1px solid ${asciiColors.warning}`,
                borderRadius: 2,
                background: asciiColors.warning,
                color: asciiColors.background,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: "Consolas",
                fontWeight: 600,
                outline: "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.warning + "CC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = asciiColors.warning;
              }}
            >
              🔄 Reboot
            </button>
          )}
        </div>
      </div>
    );
  };

  if (treeData.length === 0) {
    return (
      <AsciiPanel title="CUSTOM JOBS TREE">
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          color: asciiColors.muted,
          fontFamily: "Consolas",
          fontSize: 12
        }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
            opacity: 0.5,
            fontFamily: "Consolas"
          }}>
            {ascii.blockFull}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            color: asciiColors.foreground,
            fontFamily: "Consolas"
          }}>
            No custom jobs available
          </div>
          <div style={{
            fontSize: 12,
            opacity: 0.7,
            fontFamily: "Consolas"
          }}>
            Create a new job to get started.
          </div>
        </div>
      </AsciiPanel>
    );
  }

  return (
    <AsciiPanel title="CUSTOM JOBS TREE">
      <div style={{
        maxHeight: 800,
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: "Consolas",
        fontSize: 12
      }}>
        {treeData.map((schema, index) => 
          renderSchema(schema, 0, index === treeData.length - 1)
        )}
      </div>
    </AsciiPanel>
  );
};

export default CustomJobsTreeView;

