import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Landing from '@/pages/Landing';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Communities from '@/pages/Communities';
import CommunityDetail from '@/pages/CommunityDetail';
import Tasks from '@/pages/Tasks';
import TaskDetail from '@/pages/TaskDetail';
import UsersManagement from '@/pages/UsersManagement';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import Suppliers from '@/pages/Suppliers';
import Maintenances from '@/pages/Maintenances';
import MaintenanceDetail from '@/pages/MaintenanceDetail';
import Providers from '@/pages/Providers';
import BuildingHealth from '@/pages/BuildingHealth';
import RolesManagement from '@/pages/RolesManagement';
import BudgetDashboard from '@/pages/BudgetDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Cargando Comunidad Conecta...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/communities/:id" element={<CommunityDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/maintenances" element={<Maintenances />} />
        <Route path="/maintenances/:id" element={<MaintenanceDetail />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/building-health" element={<BuildingHealth />} />
        <Route path="/roles" element={<RolesManagement />} />
        <Route path="/budget-dashboard" element={<BudgetDashboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App