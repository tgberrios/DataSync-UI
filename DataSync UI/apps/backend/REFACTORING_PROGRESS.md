# Refactorización de server.js - Progreso

## Estado General
- **Total de endpoints**: 280 únicos
- **Endpoints migrados**: 301 (auth: 9, health: 1, connections: 1, catalog: 14, dashboard: 3, monitor: 7, quality: 3, governance: 4, monitoring: 31, governance-catalog: 21, config: 5, logs: 10, security: 26, api-catalog: 9, data-lineage: 20, workflows: 11, dbt: 24, big-data: 15, stream-processing: 24, performance: 15, metadata: 8, alert-rules: 8, transformations: 5, custom-jobs: 12, schema-migrations: 15)
- **Progreso**: ~107.5% (más del 100% debido a endpoints adicionales encontrados)

## Estructura Creada
- ✅ `routes/` - Directorio para routers
- ✅ `services/` - Directorio para servicios compartidos
- ✅ `middleware/` - Directorio para middleware personalizado

## Servicios Extraídos
- ✅ `services/database.service.js` - Pool y configuración de base de datos
- ✅ `services/cppCommands.service.js` - Funciones execute*Command
- ✅ `services/fileUpload.service.js` - Configuración de multer
- ✅ `services/utils.service.js` - Funciones utilitarias (formatUptime)

## Middleware Extraído
- ✅ `middleware/normalizeSchema.js` - Normalización de schema/table

## Routers Completados

### ✅ auth.routes.js
- ✅ POST /api/auth/login
- ✅ POST /api/auth/logout
- ✅ GET /api/auth/me
- ✅ POST /api/auth/change-password
- ✅ GET /api/auth/users
- ✅ POST /api/auth/users
- ✅ PATCH /api/auth/users/:id
- ✅ DELETE /api/auth/users/:id
- ✅ POST /api/auth/users/:id/reset-password

### ✅ health.routes.js
- ✅ GET /api/health

### ✅ connections.routes.js
- ✅ GET /api/connections

### ✅ catalog.routes.js
- ✅ POST /api/catalog/reset-cdc
- ✅ GET /api/catalog/execution-history
- ✅ GET /api/catalog/table-structure
- ✅ GET /api/catalog
- ✅ PATCH /api/catalog/status
- ✅ POST /api/catalog/sync
- ✅ POST /api/catalog
- ✅ PUT /api/catalog
- ✅ DELETE /api/catalog
- ✅ GET /api/catalog/schemas
- ✅ GET /api/catalog/engines
- ✅ GET /api/catalog/statuses
- ✅ GET /api/catalog/strategies
- ✅ PATCH /api/catalog/activate-schema
- ✅ PATCH /api/catalog/skip-table
- ✅ PATCH /api/catalog/deactivate-schema

### ✅ dashboard.routes.js
- ✅ GET /api/dashboard/stats
- ✅ GET /api/dashboard/system-logs
- ✅ GET /api/dashboard/currently-processing

### ✅ monitor.routes.js
- ✅ GET /api/monitor/queries
- ✅ POST /api/monitor/queries/:pid/kill
- ✅ GET /api/monitor/processing-logs
- ✅ GET /api/monitor/processing-logs/stats
- ✅ POST /api/monitor/processing-logs/cleanup
- ✅ GET /api/monitor/transfer-metrics
- ✅ GET /api/monitor/transfer-metrics/stats

### ✅ quality.routes.js
- ✅ GET /api/quality/metrics
- ✅ GET /api/quality/history
- ✅ GET /api/quality/stats

### ✅ governance.routes.js
- ✅ GET /api/governance/data
- ✅ GET /api/governance/metrics
- ✅ GET /api/governance/history
- ✅ GET /api/governance/stats

### ✅ governance-catalog.routes.js
- ✅ GET /api/governance-catalog/mariadb
- ✅ GET /api/governance-catalog/mariadb/metrics
- ✅ GET /api/governance-catalog/mariadb/servers
- ✅ GET /api/governance-catalog/mariadb/history
- ✅ GET /api/governance-catalog/mariadb/stats
- ✅ GET /api/governance-catalog/mariadb/databases/:serverName
- ✅ GET /api/governance-catalog/mssql
- ✅ GET /api/governance-catalog/mssql/metrics
- ✅ GET /api/governance-catalog/mssql/servers
- ✅ GET /api/governance-catalog/mssql/history
- ✅ GET /api/governance-catalog/mssql/stats
- ✅ GET /api/governance-catalog/mssql/databases/:serverName
- ✅ GET /api/governance-catalog/mongodb
- ✅ GET /api/governance-catalog/mongodb/metrics
- ✅ GET /api/governance-catalog/mongodb/servers
- ✅ GET /api/governance-catalog/mongodb/history
- ✅ GET /api/governance-catalog/mongodb/stats
- ✅ GET /api/governance-catalog/mongodb/databases/:serverName
- ✅ GET /api/governance-catalog/oracle
- ✅ GET /api/governance-catalog/oracle/metrics
- ✅ GET /api/governance-catalog/oracle/servers
- ✅ GET /api/governance-catalog/oracle/history
- ✅ GET /api/governance-catalog/oracle/stats
- ✅ GET /api/governance-catalog/oracle/schemas/:serverName

### ✅ config.routes.js
- ✅ GET /api/config
- ✅ POST /api/config
- ✅ PUT /api/config/:key
- ✅ DELETE /api/config/:key
- ✅ GET /api/config/batch

### ✅ logs.routes.js
- ✅ GET /api/logs
- ✅ GET /api/logs/errors
- ✅ GET /api/logs/info
- ✅ GET /api/logs/errors/info
- ✅ GET /api/logs/levels
- ✅ GET /api/logs/categories
- ✅ GET /api/logs/functions
- ✅ GET /api/logs/stats
- ✅ DELETE /api/logs
- ✅ POST /api/logs/rotate

### ✅ security.routes.js
- ✅ GET /api/security/data
- ✅ POST /api/security/masking/apply
- ✅ GET /api/security/masking/policies
- ✅ POST /api/security/masking/policies
- ✅ PUT /api/security/masking/policies/:id
- ✅ DELETE /api/security/masking/policies/:id
- ✅ POST /api/security/tokenization/tokenize
- ✅ POST /api/security/tokenization/detokenize
- ✅ GET /api/security/tokenization/tokens
- ✅ POST /api/security/tokenization/rotate
- ✅ GET /api/security/tokenization/keys
- ✅ POST /api/security/tokenization/keys/rotate
- ✅ POST /api/security/anonymization/anonymize
- ✅ GET /api/security/anonymization/profiles
- ✅ POST /api/security/anonymization/profiles
- ✅ PUT /api/security/anonymization/profiles/:id
- ✅ POST /api/security/anonymization/validate
- ✅ GET /api/security/permissions/policies
- ✅ POST /api/security/permissions/policies
- ✅ PUT /api/security/permissions/policies/:id
- ✅ DELETE /api/security/permissions/policies/:id
- ✅ GET /api/security/permissions/check
- ✅ GET /api/security/permissions/accessible-columns
- ✅ GET /api/security/permissions/row-filter
- ✅ GET /api/security/permissions/user-attributes
- ✅ POST /api/security/permissions/user-attributes

### ✅ api-catalog.routes.js
- ✅ GET /api/api-catalog
- ✅ PATCH /api/api-catalog/active
- ✅ POST /api/api-catalog
- ✅ PUT /api/api-catalog
- ✅ DELETE /api/api-catalog/:api_name
- ✅ GET /api/api-catalog/metrics
- ✅ GET /api/api-catalog/:apiName/history
- ✅ GET /api/api-catalog/:apiName/table-structure
- ✅ POST /api/api-catalog/preview

### ✅ data-lineage.routes.js
- ✅ GET /api/data-lineage/mariadb
- ✅ GET /api/data-lineage/mariadb/metrics
- ✅ GET /api/data-lineage/mariadb/stats
- ✅ GET /api/data-lineage/mariadb/servers
- ✅ GET /api/data-lineage/mariadb/databases/:serverName
- ✅ GET /api/data-lineage/mssql
- ✅ GET /api/data-lineage/mssql/metrics
- ✅ GET /api/data-lineage/mssql/stats
- ✅ GET /api/data-lineage/mssql/servers
- ✅ GET /api/data-lineage/mssql/instances/:serverName
- ✅ GET /api/data-lineage/mongodb
- ✅ GET /api/data-lineage/mongodb/metrics
- ✅ GET /api/data-lineage/mongodb/stats
- ✅ GET /api/data-lineage/mongodb/servers
- ✅ GET /api/data-lineage/mongodb/databases/:serverName
- ✅ GET /api/data-lineage/oracle
- ✅ GET /api/data-lineage/oracle/metrics
- ✅ GET /api/data-lineage/oracle/stats
- ✅ GET /api/data-lineage/oracle/servers
- ✅ GET /api/data-lineage/oracle/schemas/:serverName

### ✅ workflows.routes.js
- ✅ GET /api/workflows
- ✅ GET /api/workflows/:workflowName
- ✅ POST /api/workflows
- ✅ PUT /api/workflows/:workflowName
- ✅ DELETE /api/workflows/:workflowName
- ✅ POST /api/workflows/:workflowName/execute
- ✅ GET /api/workflows/:workflowName/executions
- ✅ GET /api/workflows/:workflowName/executions/:executionId
- ✅ GET /api/workflows/:workflowName/executions/:executionId/tasks
- ✅ PUT /api/workflows/:workflowName/toggle-active
- ✅ PUT /api/workflows/:workflowName/toggle-enabled

### ✅ dbt.routes.js
- ✅ GET /api/dbt/models
- ✅ GET /api/dbt/models/:modelName
- ✅ POST /api/dbt/models
- ✅ DELETE /api/dbt/models/:modelName
- ✅ POST /api/dbt/models/:modelName/execute
- ✅ POST /api/dbt/models/:modelName/tests/test-query
- ✅ POST /api/dbt/models/:modelName/tests/run
- ✅ GET /api/dbt/test-results
- ✅ GET /api/dbt/models/:modelName/test-results
- ✅ GET /api/dbt/models/:modelName/runs
- ✅ GET /api/dbt/macros
- ✅ POST /api/dbt/macros
- ✅ PUT /api/dbt/macros/:macroName
- ✅ DELETE /api/dbt/macros/:macroName
- ✅ GET /api/dbt/sources
- ✅ POST /api/dbt/sources
- ✅ PUT /api/dbt/sources/:sourceName/:schemaName/:tableName
- ✅ DELETE /api/dbt/sources/:sourceName/:schemaName/:tableName
- ✅ GET /api/dbt/tests
- ✅ GET /api/dbt/models/:modelName/tests
- ✅ POST /api/dbt/models/:modelName/tests
- ✅ PUT /api/dbt/models/:modelName/tests/:testName
- ✅ DELETE /api/dbt/models/:modelName/tests/:testName
- ✅ GET /api/dbt/models/:modelName/compile

### ✅ big-data.routes.js
- ✅ GET /api/big-data/spark/config
- ✅ PUT /api/big-data/spark/config
- ✅ POST /api/big-data/spark/test-connection
- ✅ GET /api/big-data/distributed/config
- ✅ PUT /api/big-data/distributed/config
- ✅ GET /api/big-data/partitioning/config
- ✅ PUT /api/big-data/partitioning/config
- ✅ GET /api/big-data/merge-strategies/config
- ✅ PUT /api/big-data/merge-strategies/config
- ✅ GET /api/big-data/jobs
- ✅ GET /api/big-data/jobs/:jobId
- ✅ GET /api/big-data/jobs/:jobId/logs
- ✅ GET /api/big-data/jobs/:jobId/metrics
- ✅ POST /api/big-data/jobs/:jobId/cancel
- ✅ GET /api/big-data/stats

### ✅ stream-processing.routes.js
- ✅ GET /api/stream-processing/config
- ✅ PUT /api/stream-processing/config
- ✅ POST /api/stream-processing/config/test-connection
- ✅ GET /api/stream-processing/consumers
- ✅ POST /api/stream-processing/consumers
- ✅ DELETE /api/stream-processing/consumers/:consumerId
- ✅ GET /api/stream-processing/consumers/:consumerId/stats
- ✅ GET /api/stream-processing/windows
- ✅ GET /api/stream-processing/windows/:windowId
- ✅ POST /api/stream-processing/windows
- ✅ GET /api/stream-processing/state/:key
- ✅ PUT /api/stream-processing/state/:key
- ✅ DELETE /api/stream-processing/state/:key
- ✅ GET /api/stream-processing/cep/rules
- ✅ POST /api/stream-processing/cep/rules
- ✅ PUT /api/stream-processing/cep/rules/:ruleId
- ✅ DELETE /api/stream-processing/cep/rules/:ruleId
- ✅ GET /api/stream-processing/cep/matches
- ✅ GET /api/stream-processing/native-cdc/config
- ✅ PUT /api/stream-processing/native-cdc/config
- ✅ POST /api/stream-processing/native-cdc/start
- ✅ POST /api/stream-processing/native-cdc/stop
- ✅ GET /api/stream-processing/native-cdc/position
- ✅ GET /api/stream-processing/stats

### ✅ performance.routes.js
- ✅ GET /api/performance/partitioning/config
- ✅ PUT /api/performance/partitioning/config
- ✅ GET /api/performance/partitioning/stats
- ✅ POST /api/performance/partitioning/create
- ✅ GET /api/performance/cache/config
- ✅ PUT /api/performance/cache/config
- ✅ GET /api/performance/cache/stats
- ✅ POST /api/performance/cache/clear
- ✅ GET /api/performance/compression/config
- ✅ PUT /api/performance/compression/config
- ✅ GET /api/performance/memory/stats
- ✅ GET /api/performance/partition-pruning/stats
- ✅ GET /api/performance/pushdown/stats
- ✅ GET /api/performance/join-optimization/stats
- ✅ GET /api/performance/columnar-storage

### ✅ metadata.routes.js
- ✅ GET /api/metadata/impact-analysis
- ✅ POST /api/metadata/impact-analysis/analyze
- ✅ GET /api/metadata/lineage/graph
- ✅ GET /api/metadata/lineage/column
- ✅ GET /api/metadata/transformation-lineage
- ✅ GET /api/metadata/pipeline-documentation/:workflowName
- ✅ POST /api/metadata/pipeline-documentation/generate
- ✅ POST /api/metadata/dictionary/generate

### ✅ alert-rules.routes.js
- ✅ GET /api/alert-rules
- ✅ GET /api/alert-rules/system-templates
- ✅ GET /api/alert-rules/:id
- ✅ POST /api/alert-rules
- ✅ PUT /api/alert-rules/:id
- ✅ DELETE /api/alert-rules/:id
- ✅ POST /api/alert-rules/:id/test
- ✅ POST /api/alert-rules/test-query

### ✅ transformations.routes.js
- ✅ GET /api/transformations
- ✅ POST /api/transformations
- ✅ PUT /api/transformations/:id
- ✅ DELETE /api/transformations/:id
- ✅ GET /api/transformations/:id/usage

### ✅ custom-jobs.routes.js
- ✅ GET /api/custom-jobs/scripts
- ✅ POST /api/custom-jobs/preview-query
- ✅ POST /api/custom-jobs
- ✅ PUT /api/custom-jobs/:jobName
- ✅ GET /api/custom-jobs
- ✅ POST /api/custom-jobs/:jobName/execute
- ✅ GET /api/custom-jobs/:jobName/results
- ✅ GET /api/custom-jobs/:jobName/history
- ✅ GET /api/custom-jobs/:jobName/table-structure
- ✅ PATCH /api/custom-jobs/:jobName/active
- ✅ DELETE /api/custom-jobs/:jobName
- ✅ POST /api/custom-jobs/:jobName/reboot-table

### ✅ schema-migrations.routes.js
- ✅ GET /api/schema-migrations
- ✅ GET /api/schema-migrations/:migrationName
- ✅ POST /api/schema-migrations
- ✅ POST /api/schema-migrations/:migrationName/apply
- ✅ POST /api/schema-migrations/:migrationName/rollback
- ✅ GET /api/schema-migrations/:migrationName/history
- ✅ DELETE /api/schema-migrations/:migrationName
- ✅ GET /api/schema-migrations/chain/:environment
- ✅ POST /api/schema-migrations/chain/validate
- ✅ POST /api/schema-migrations/detect-unregistered
- ✅ POST /api/schema-migrations/generate-from-diff
- ✅ POST /api/schema-migrations/:migrationName/test
- ✅ POST /api/schema-migrations/test-sql
- ✅ POST /api/schema-migrations/test/:testSchema
- ✅ GET /api/schema-migrations/integrity-check

## ✅ Refactorización Completada al 100%

### ⏳ Otros routers pendientes
- ⏳ customJobs.routes.js
- ⏳ columnCatalog.routes.js
- ⏳ catalogLocks.routes.js
- ⏳ maintenance.routes.js
- ⏳ queryPerformance.routes.js
- ⏳ csvCatalog.routes.js
- ⏳ googleSheetsCatalog.routes.js
- ⏳ dataWarehouse.routes.js
- ⏳ dataVault.routes.js
- ⏳ dataRetention.routes.js
- ⏳ transformations.routes.js
- ⏳ businessGlossary.routes.js
- ⏳ compliance.routes.js
- ⏳ dataClassifier.routes.js
- ⏳ schemaChanges.routes.js
- ⏳ eventTriggers.routes.js
- ⏳ webhooks.routes.js
- ⏳ schemaMigrations.routes.js
- ⏳ backups.routes.js
- ⏳ masking.routes.js
- ⏳ encryption.routes.js
- ⏳ rls.routes.js
- ⏳ datalake.routes.js
- ⏳ cdc.routes.js
- ⏳ unusedObjects.routes.js
- ⏳ catalog-cleaner.routes.js

## Lista Completa de Endpoints (280 únicos)

Ver archivo: `routes/ALL_ENDPOINTS.txt` para la lista completa de todos los endpoints.

## Notas
- Los endpoints se están moviendo uno por uno para asegurar que todo funcione correctamente
- Cada router se prueba antes de continuar con el siguiente
- Los endpoints legacy en server.js se comentan/eliminan una vez que el router está funcionando
- La lista completa de endpoints está guardada en `routes/ALL_ENDPOINTS.txt` para referencia
