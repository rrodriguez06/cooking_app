import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { setUnauthorizedHandler } from '../services';
import { toast } from './ui/sonner';

/**
 * Enregistre le handler de session expirée (401) utilisé par l'intercepteur axios :
 * logout + redirection propre vers /login (au lieu d'un window.location.href — ERR-2).
 * Doit être rendu à l'intérieur du <Router>.
 */
export const AuthSessionHandler = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.error('Votre session a expiré. Veuillez vous reconnecter.');
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout, navigate]);

  return null;
};
