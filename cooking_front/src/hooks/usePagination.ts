import { useState, useCallback } from 'react';

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UsePaginationReturn {
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPaginationData: (data: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  }) => void;
  resetPagination: () => void;
}

export const usePagination = (initialPage: number = 1): UsePaginationReturn => {
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: initialPage,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        hasNext: page < prev.totalPages,
        hasPrev: page > 1,
      }));
    }
  }, [pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      goToPage(pagination.currentPage + 1);
    }
  }, [pagination.hasNext, pagination.currentPage, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      goToPage(pagination.currentPage - 1);
    }
  }, [pagination.hasPrev, pagination.currentPage, goToPage]);

  const setPaginationData = useCallback((data: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  }) => {
    setPagination({
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalCount: data.totalCount,
      hasNext: data.hasNext ?? data.currentPage < data.totalPages,
      hasPrev: data.hasPrev ?? data.currentPage > 1,
    });
  }, []);

  const resetPagination = useCallback(() => {
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasNext: false,
      hasPrev: false,
    });
  }, []);

  return {
    pagination,
    goToPage,
    nextPage,
    prevPage,
    setPaginationData,
    resetPagination,
  };
};

export default usePagination;