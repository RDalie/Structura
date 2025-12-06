import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShellLayout } from './layout/ShellLayout';
import { navItems } from './core/nav';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { HealthStatusPage } from './pages/HealthStatusPage';

export default function App() {
  const placeholderItems = navItems.filter((item) => item.key !== 'health');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShellLayout />}>
          <Route index element={<Navigate to="/graph" replace />} />
          <Route path="health" element={<HealthStatusPage />} />
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
