import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import FormField from '../../components/common/FormField.jsx';
import { APP_NAME, ROUTES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { loginSchema } from '../../schemas/loginSchema.js';
import { supabase } from '../../lib/supabase.js';
import { getAuthErrorMessage } from '../../utils/authErrors.js';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitError, setSubmitError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleLogin({ email, password }) {
    setSubmitError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const { data: dbProfile } = await supabase
          .from('user_profiles')
          .select('role, can_view_hod')
          .eq('id', data.user.id)
          .single();

        const userEmail = data.user.email.toLowerCase();
        const dbRole = dbProfile?.role?.toLowerCase() || '';
        
        const isHOD = dbRole === 'hod' || dbProfile?.can_view_hod === true;
        const isDirector = dbRole === 'director';

        if (isDirector) navigate('/director', { replace: true });
        else if (isHOD) navigate('/hod-dashboard', { replace: true });
        else if (dbRole === 'faculty' || userEmail.includes('faculty')) navigate('/faculty', { replace: true });
        else navigate('/student', { replace: true });
      }
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-card__subtitle">Access your {APP_NAME} account</p>

        <form className="login-form" onSubmit={handleSubmit(handleLogin)} noValidate>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting || isLoading}
              {...register('email')}
            />
          </FormField>

          <FormField id="password" label="Password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting || isLoading}
              {...register('password')}
            />
          </FormField>

          {submitError ? (
            <p className="login-form__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting || isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-card__footer">
          <Link to={ROUTES.HOME}>Back to home</Link>
        </p>
      </div>
    </div>
  );
}
