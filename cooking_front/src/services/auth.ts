import api from './api';
import type {
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserLoginRequest,
  UserPasswordResetRequestPayload,
  UserPasswordResetRequestResponse,
  UserPasswordResetConfirmPayload,
  UserPasswordResetResponse,
  UserPasswordChangePayload,
  AuthSuccessResponse,
  UserDetailsResponse,
  UserListResponse,
  QueryParams,
} from '../types';

export const authService = {
  // Login
  async login(credentials: UserLoginRequest): Promise<AuthSuccessResponse> {
    const response = await api.post<AuthSuccessResponse>('/users/login', credentials);
    
    // Store token and user info
    if (response.data.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }

    return response.data;
  },

  // Register
  async register(userData: UserCreateRequest): Promise<AuthSuccessResponse> {
    const response = await api.post<AuthSuccessResponse>('/users', userData);
    
    // Auto-login after registration
    if (response.data.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    
    return response.data;
  },

  // Get current user
  async getCurrentUser(): Promise<UserDetailsResponse> {
    const response = await api.get<UserDetailsResponse>('/users/me');
    return response.data;
  },

  // Logout
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Check if user is logged in
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  // Get stored user (tolère un localStorage corrompu sans casser le démarrage de l'app)
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

  // Get stored token
  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  // Mot de passe oublié — étape 1 : demander un jeton de réinitialisation à expiration
  async requestPasswordReset(
    payload: UserPasswordResetRequestPayload,
  ): Promise<UserPasswordResetRequestResponse> {
    const response = await api.post<UserPasswordResetRequestResponse>(
      '/users/reset-password/request',
      payload,
    );
    return response.data;
  },

  // Mot de passe oublié — étape 2 : confirmer avec le jeton + nouveau mot de passe
  async confirmPasswordReset(
    payload: UserPasswordResetConfirmPayload,
  ): Promise<UserPasswordResetResponse> {
    const response = await api.post<UserPasswordResetResponse>(
      '/users/reset-password/confirm',
      payload,
    );
    return response.data;
  },
};

export const userService = {
  // Get user by ID
  async getUser(id: number): Promise<UserDetailsResponse> {
    const response = await api.get<UserDetailsResponse>(`/users/${id}`);
    return response.data;
  },

  // Update user
  async updateUser(id: number, userData: UserUpdateRequest): Promise<UserDetailsResponse> {
    const response = await api.put<UserDetailsResponse>(`/users/${id}`, userData);
    return response.data;
  },

  // Changer le mot de passe (exige le mot de passe actuel)
  async changePassword(
    id: number,
    payload: UserPasswordChangePayload,
  ): Promise<UserPasswordResetResponse> {
    const response = await api.put<UserPasswordResetResponse>(`/users/${id}/password`, payload);
    return response.data;
  },

  // Delete user
  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // List users (admin only)
  async listUsers(params?: QueryParams): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>('/users', { params });
    return response.data;
  },
};
