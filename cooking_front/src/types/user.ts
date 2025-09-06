// Import des types nécessaires
import type { Recipe } from './recipe';
import type { RecipeList } from './recipeList';

export interface User {
  id: string; // Changed from number to string to match server
  username: string;
  email: string;
  avatar?: string;
  is_active?: boolean; // Made optional
  created_at?: string; // Made optional
  updated_at?: string; // Made optional
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  password?: string;
  avatar?: string;
  is_active?: boolean;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserPasswordResetRequest {
  email: string;
  new_password: string;
  confirm_password: string;
}

export interface UserPasswordResetResponse {
  success: boolean;
  message: string;
}

export interface UserLoginResponse {
  user: User;
  token: string;
}

// This matches the actual server response structure
export interface AuthSuccessResponse {
  success: boolean;
  message: string;
  data: User; // Server returns UserResponse directly, not wrapped in UserLoginResponse
  token: string; // Token is at root level
}

export interface UserDetailsResponse {
  success: boolean;
  message?: string;
  data: User;
}

export interface UserListResponse {
  success: boolean;
  data: {
    users: User[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Interfaces pour le système de suivi
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  follower?: User;
  following?: User;
}

export interface UserProfileResponse {
  success: boolean;
  data: {
    user: User;
    public_recipes: Recipe[];
    public_lists: RecipeList[];
    is_following: boolean;
    followers_count: number;
    following_count: number;
    recipe_count: number;
  };
}

export interface UserFollowResponse {
  success: boolean;
  message: string;
  is_following: boolean;
}

export interface UserFollowListResponse {
  success: boolean;
  data: {
    users: User[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
