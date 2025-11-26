import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "./layout/ShellLayout";
import { navItems } from "./core/nav";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShellLayout />}>
          <Route index element={<Navigate to="/graph" replace />} />
          {navItems.map((item) => (
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
