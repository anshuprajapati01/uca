import { useCallback, useState } from 'react';
import { signOut } from '../services/authService.js';
import { getAuthErrorMessage } from '../utils/authErrors.js';

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signOut();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logout, isLoading, error };
}
