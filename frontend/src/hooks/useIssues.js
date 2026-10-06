import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

export function useIssues(filters = {}) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Store filters in ref to avoid unnecessary re-creation of fetcher in interval
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchIssues = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const activeFilters = filtersRef.current;
      const params = {};
      if (activeFilters.type) params.type = activeFilters.type;
      if (activeFilters.priority) params.priority = activeFilters.priority;
      if (activeFilters.status) params.status = activeFilters.status;

      const data = await api.getIssues(params);
      setIssues(data || []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      setError('Unable to load issues. Please check your connection.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchIssues(false);
  }, [filters.type, filters.priority, filters.status, fetchIssues]);

  // 15-second background auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIssues(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchIssues]);

  return { issues, loading, error, refetch: fetchIssues };
}
