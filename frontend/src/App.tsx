import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignPage } from "./pages/SignPage";
import { UploadPage } from "./pages/UploadPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/sign/:token"
          element={
            <AppShell wide>
              <SignPage />
            </AppShell>
          }
        />
        <Route
          path="/login"
          element={
            <AppShell>
              <LoginPage />
            </AppShell>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AppShell>
              <ResetPasswordPage />
            </AppShell>
          }
        />
        <Route
          path="/"
          element={
            <AppShell>
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            </AppShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </AppShell>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
