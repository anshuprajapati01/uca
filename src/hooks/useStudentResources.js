import { useState, useEffect, useCallback } from 'react';
import { fetchStudentResources } from '../services/resourceService.js';

/**
 * @typedef {Object} Resource
 * @property {string} id
 * @property {string} title
 * @property {string|null} description
 * @property {string} type
 * @property {string|null} file_url
 * @property {string|null} external_url
 * @property {boolean} is_verified
 */

export function useStudentResources() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchStudentResources();
        if (!cancelled) {
          setResources(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useStudentResources] Load error:', err);
          setError(err);
          setResources([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    return fetchStudentResources()
      .then((data) => setResources(data))
      .catch((err) => {
        setError(err);
        setResources([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return {
    /** @type {Resource[]} */
    resources,
    isLoading,
    error,
    refetch,
  };
}
