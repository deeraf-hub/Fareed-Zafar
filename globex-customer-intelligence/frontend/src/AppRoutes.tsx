import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CustomerDetailPage } from './pages/CustomerDetail';
import { CustomerExplorerPage } from './pages/CustomerExplorer';
import { DataQualityPage } from './pages/DataQuality';
import { ModelPerformancePage } from './pages/models/ModelPerformance';
import { NotFoundPage } from './pages/NotFound';
import { OverviewPage } from './pages/Overview';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="customers" element={<CustomerExplorerPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="models" element={<ModelPerformancePage />} />
        <Route path="data-quality" element={<DataQualityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
