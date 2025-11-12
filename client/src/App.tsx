import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ObjectsPage } from "./pages/ObjectsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { UsersPage } from "./pages/UsersPage";
import { OrgStructurePage } from "./pages/OrgStructurePage";
import { RolesPage } from "./pages/RolesPage";
import { TrainingPage } from "./pages/TrainingPage";
import { AuditPage } from "./pages/AuditPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { ObjectsMapPage } from "./pages/ObjectsMapPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/objects">
        <ProtectedRoute>
          <DashboardLayout>
            <ObjectsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute>
          <DashboardLayout>
            <DocumentsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute>
          <DashboardLayout>
            <UsersPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/orgstructure">
        <ProtectedRoute>
          <DashboardLayout>
            <OrgStructurePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/roles">
        <ProtectedRoute>
          <DashboardLayout>
            <RolesPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/training">
        <ProtectedRoute>
          <DashboardLayout>
            <TrainingPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/audit">
        <ProtectedRoute>
          <DashboardLayout>
            <AuditPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <DashboardLayout>
            <ProfilePage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/certificates">
        <ProtectedRoute>
          <DashboardLayout>
            <CertificatesPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/templates">
        <ProtectedRoute>
          <DashboardLayout>
            <TemplatesPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/objects-map">
        <ProtectedRoute>
          <DashboardLayout>
            <ObjectsMapPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
