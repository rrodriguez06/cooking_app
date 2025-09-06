export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } & {
    [key: string]: T[];
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  [key: string]: any;
}
