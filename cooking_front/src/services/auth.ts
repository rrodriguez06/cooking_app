import api from './api';
import type {
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserLoginRequest,
  UserPasswordResetRequest,
  UserPasswordResetResponse,
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
      console.log('authService: Storing token:', response.data.token);
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      console.log('authService: Token stored, isAuthenticated():', !!localStorage.getItem('auth_token'));
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

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get stored token
  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  // Reset password
  async resetPassword(resetData: UserPasswordResetRequest): Promise<UserPasswordResetResponse> {
    const response = await api.post<UserPasswordResetResponse>('/users/reset-password', resetData);
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
