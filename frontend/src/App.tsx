import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { PlantGrid } from './components/plants/PlantGrid';
import { PlantDetail } from './components/plants/PlantDetail';
import { TaskQueue } from './components/tasks/TaskQueue';
import { PhotoBrowser } from './components/photos/PhotoBrowser';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<PlantGrid />} />
        <Route path="/plants/:id" element={<PlantDetail />} />
        <Route path="/tasks" element={<TaskQueue />} />
        <Route path="/photos" element={<PhotoBrowser />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
