/**
 * Maps Supabase auth errors to user-friendly messages.
 * @param {unknown} error
 * @returns {string}
 */
export function getAuthErrorMessage(error) {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong. Please try again.';
  }

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (message.includes('Too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  return message || 'Something went wrong. Please try again.';
}
