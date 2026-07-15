import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context';
import { ProtectedLayout } from './components';
import { AuthSessionHandler } from './components/AuthSessionHandler';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Toaster } from './components/ui/sonner';
import {
  HomePage,
  LoginPage,
  ProfilePage,
  UserProfilePage,
  RecipeDetailPage,
  SearchPage,
  PlanningPage,
  RecipeEditPage,
  FridgePage,
  NotFoundPage,
} from './pages';

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Toaster />
        <Router>
          <AuthSessionHandler />
          <Routes>
            {/* Route publique (sans header/nav) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Routes protégées : header/nav appliqués une seule fois via le layout de route */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/fridge" element={<FridgePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:userId" element={<UserProfilePage />} />
              <Route path="/recipe/:id" element={<RecipeDetailPage />} />
              <Route path="/recipe/:id/edit" element={<RecipeEditPage />} />
              <Route path="/recipe/new" element={<RecipeEditPage />} />
              {/* Vraie page 404 (au lieu d'une redirection silencieuse vers l'accueil) */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
