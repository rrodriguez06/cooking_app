import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { Layout } from './Layout';

/**
 * Layout de route protégé : applique une seule fois <ProtectedRoute> + <Layout> (header/nav)
 * à toutes les pages enfant via <Outlet>. Évite que chaque page réenveloppe <Layout>
 * (source d'oublis comme RecipeEditPage — cf. NAV-1/ARCH-1).
 */
export const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);
