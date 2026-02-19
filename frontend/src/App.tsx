import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShellLayout } from './layout/ShellLayout';
import { navItems } from './core/nav';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { HealthStatusPage } from './pages/HealthStatusPage';
import { IngestionPage } from './pages/IngestionPage';
import { ExperimentsPage } from './pages/ExperimentsPage';

export default function App() {
  const placeholderItems = navItems.filter(
    (item) => item.key !== 'health' && item.key !== 'ingestion' && item.key !== 'experiments'
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShellLayout />}>
          <Route index element={<Navigate to="/graph" replace />} />
          <Route path="health" element={<HealthStatusPage />} />
          <Route path="ingestion" element={<IngestionPage />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          {placeholderItems.map((item) => (
            <Route
              key={item.key}
              path={item.key}
              element={
                <PlaceholderPage
                  title={`${item.label} view`}
                  blurb={`This placeholder stands in for the ${item.label.toLowerCase()} experience. ${item.blurb}`}
                />
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/graph" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
