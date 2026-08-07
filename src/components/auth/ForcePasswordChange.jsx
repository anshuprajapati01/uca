import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import toast from 'react-hot-toast';

export default function ForcePasswordChange() {
  const { profile, updateProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw authError;

      const { data: updatedData, error: dbError } = await supabase
        .from('user_profiles')
        .update({ has_changed_password: true })
        .eq('id', profile?.id)
        .select();

      if (dbError) {
        alert('Database Update Failed: ' + dbError.message);
        return;
      }
      if (!updatedData || updatedData.length === 0) {
        alert('Update blocked by RLS or ID mismatch! Profile not saved.');
        return;
      }

      updateProfile({ ...profile, has_changed_password: true });

      toast.success('Password updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          backgroundColor: '#1e293b',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h2
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#f1f5f9',
          }}
        >
          Welcome to UCA!
        </h2>
        <p
          style={{
            margin: '0 0 1.5rem',
            fontSize: '0.95rem',
            color: '#94a3b8',
            lineHeight: '1.6',
          }}
        >
          For security reasons, please change your default password before
          accessing your dashboard.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          noValidate
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="new-password"
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#cbd5e1',
              }}
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              minLength={6}
              required
              disabled={isLoading}
              style={{
                padding: '0.625rem 0.75rem',
                border: '1px solid #334155',
                borderRadius: '8px',
                font: 'inherit',
                fontSize: '0.95rem',
                color: '#f1f5f9',
                backgroundColor: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="confirm-password"
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#cbd5e1',
              }}
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={6}
              required
              disabled={isLoading}
              style={{
                padding: '0.625rem 0.75rem',
                border: '1px solid #334155',
                borderRadius: '8px',
                font: 'inherit',
                fontSize: '0.95rem',
                color: '#f1f5f9',
                backgroundColor: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          {error ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                color: '#f87171',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1rem',
              border: 'none',
              borderRadius: '8px',
              font: 'inherit',
              fontWeight: '500',
              fontSize: '0.95rem',
              color: '#fff',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Updating Password…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}