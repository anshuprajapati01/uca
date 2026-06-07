import { useAuth } from './useAuth.js';

export function useRole() {
  const { role, profile } = useAuth();

  return { role, profile };
}
