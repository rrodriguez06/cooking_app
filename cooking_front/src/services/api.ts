import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handler d'expiration de session, enregistré par un composant DANS le Router
// (permet un logout + navigate propres au lieu d'un window.location.href qui casse la SPA — ERR-2).
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export const setUnauthorizedHandler = (fn: UnauthorizedHandler | null) => {
  unauthorizedHandler = fn;
};

// Message d'erreur API cohérent et en français (ERR-1) — à utiliser par les appelants.
export function getApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }
    const status = error.response.status;
    if (status >= 500) return 'Erreur serveur. Réessayez dans un instant.';
    if (status === 403) return "Vous n'avez pas les droits pour effectuer cette action.";
    if (status === 404) return 'Ressource introuvable.';
    if (status === 409) return 'Conflit : cette valeur est déjà utilisée.';
    const data = error.response.data as { message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url || '';
    // Ne pas déconnecter globalement sur un 401 des endpoints d'auth (login/reset : géré localement).
    const isAuthEndpoint = url.includes('/users/login') || url.includes('/reset-password');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else {
        // Repli si aucun handler React n'est enregistré (ex. hors Router).
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
