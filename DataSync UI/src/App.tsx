import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/shared/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteTransition from "./components/shared/RouteTransition";

const Dashboard = lazy(() => import("./components/dashboard/Dashboard"));
const Catalog = lazy(() => import("./components/catalog/Catalog"));
const UnifiedMonitor = lazy(() => import("./components/monitoring/UnifiedMonitor"));
const Quality = lazy(() => import("./components/quality/Quality"));
const Governance = lazy(() => import("./components/governance/Governance"));
const Security = lazy(() => import("./components/security/Security"));
const LogsViewer = lazy(() => import("./components/monitoring/LogsViewer"));
const Config = lazy(() => import("./components/config/Config"));
const Maintenance = lazy(() => import("./components/maintenance/Maintenance"));
const ColumnCatalog = lazy(() => import("./components/catalog/ColumnCatalog"));
const CatalogLocks = lazy(() => import("./components/catalog/CatalogLocks"));
const DataLineageMariaDB = lazy(() => import("./components/data-lineage/DataLineageMariaDB"));
const DataLineageMSSQL = lazy(() => import("./components/data-lineage/DataLineageMSSQL"));
const DataLineageMongoDB = lazy(() => import("./components/data-lineage/DataLineageMongoDB"));
const DataLineageOracle = lazy(() => import("./components/data-lineage/DataLineageOracle"));
const GovernanceCatalogMariaDB = lazy(
  () => import("./components/governance/GovernanceCatalogMariaDB")
);
const GovernanceCatalogMSSQL = lazy(
  () => import("./components/governance/GovernanceCatalogMSSQL")
);
const GovernanceCatalogMongoDB = lazy(
  () => import("./components/governance/GovernanceCatalogMongoDB")
);
const GovernanceCatalogOracle = lazy(
  () => import("./components/governance/GovernanceCatalogOracle")
);
const APICatalog = lazy(() => import("./components/api/APICatalog"));
const CustomJobs = lazy(() => import("./components/jobs/CustomJobs"));
const DataWarehouse = lazy(() => import("./components/data-warehouse/DataWarehouse"));
const DataVault = lazy(() => import("./components/data-vault/DataVault"));
const BigDataProcessing = lazy(() => import("./components/big-data/BigDataProcessing"));
const StreamProcessing = lazy(() => import("./components/stream-processing/StreamProcessing"));
const PerformanceOptimization = lazy(() => import("./components/performance/PerformanceOptimization"));
const MetadataDocumentation = lazy(() => import("./components/metadata/MetadataDocumentation"));
const SecurityAdvanced = lazy(() => import("./components/security/SecurityAdvanced"));
const Workflows = lazy(() => import("./components/workflows/Workflows"));
const DBTModels = lazy(() => import("./components/dbt/DBTModels"));
const DBTMacros = lazy(() => import("./components/dbt/DBTMacros"));
const DBTSources = lazy(() => import("./components/dbt/DBTSources"));
const CSVCatalog = lazy(() => import("./components/csv/CSVCatalog"));
const GoogleSheetsCatalog = lazy(() => import("./components/google-sheets/GoogleSheetsCatalog"));
const UserManagement = lazy(() => import("./components/security/UserManagement"));
const Webhooks = lazy(() => import("./components/governance/Webhooks"));
const SchemaMigrations = lazy(() => import("./components/migrations/SchemaMigrations"));
const BackupManager = lazy(() => import("./components/backups/BackupManager"));
const DataMasking = lazy(() => import("./components/governance/DataMasking"));
const DataEncryption = lazy(() => import("./components/governance/DataEncryption"));
const RowLevelSecurity = lazy(() => import("./components/governance/RowLevelSecurity"));
const AuditTrail = lazy(() => import("./components/governance/AuditTrail"));
const BusinessGlossary = lazy(() => import("./components/governance/BusinessGlossary"));
const ComplianceManager = lazy(() => import("./components/governance/ComplianceManager"));
const DataRetention = lazy(() => import("./components/governance/DataRetention"));
const DataClassifier = lazy(() => import("./components/governance/DataClassifier"));
const SchemaChangeAuditor = lazy(() => import("./components/governance/SchemaChangeAuditor"));
const EventTriggers = lazy(() => import("./components/workflows/EventTriggers"));
const Transformations = lazy(() => import("./components/transformations/Transformations"));
const Login = lazy(() => import("./components/auth/Login"));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <RouteTransition minDelay={750}>
            <Suspense fallback={null}>
              <Login />
            </Suspense>
          </RouteTransition>
        } />
          <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Catalog />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="column-catalog"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <ColumnCatalog />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog-locks"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <CatalogLocks />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-lineage-mariadb"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataLineageMariaDB />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-lineage-mssql"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataLineageMSSQL />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-lineage-mongodb"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataLineageMongoDB />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-lineage-oracle"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataLineageOracle />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="governance-catalog-mariadb"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <GovernanceCatalogMariaDB />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="governance-catalog-mssql"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <GovernanceCatalogMSSQL />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="governance-catalog-mongodb"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <GovernanceCatalogMongoDB />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="governance-catalog-oracle"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <GovernanceCatalogOracle />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="api-catalog"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <APICatalog />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="custom-jobs"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <CustomJobs />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-warehouse"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataWarehouse />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-vault"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataVault />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="big-data"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <BigDataProcessing />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="stream-processing"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <StreamProcessing />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="performance"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <PerformanceOptimization />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="metadata"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <MetadataDocumentation />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="security-advanced"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <SecurityAdvanced />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="workflows"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Workflows />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="dbt-models"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DBTModels />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="dbt-macros"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DBTMacros />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="dbt-sources"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DBTSources />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="csv-catalog"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <CSVCatalog />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="google-sheets-catalog"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <GoogleSheetsCatalog />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="monitor"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <UnifiedMonitor />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="query-performance"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <UnifiedMonitor />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="maintenance"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Maintenance />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="live-changes"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <UnifiedMonitor />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="quality"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Quality />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="governance"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Governance />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="security"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Security />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="logs"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <LogsViewer />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="config"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Config />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="user-management"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <UserManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="webhooks"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Webhooks />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="schema-migrations"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <SchemaMigrations />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="backups"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <BackupManager />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-masking"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataMasking />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-encryption"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataEncryption />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="row-level-security"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <RowLevelSecurity />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-trail"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <AuditTrail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="business-glossary"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <BusinessGlossary />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="compliance-manager"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <ComplianceManager />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-retention"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataRetention />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="data-classifier"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <DataClassifier />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="schema-change-auditor"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <SchemaChangeAuditor />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="event-triggers"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <EventTriggers />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="transformations"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Transformations />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App