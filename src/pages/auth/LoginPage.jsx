import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../../components/common/FormField.jsx';
import { APP_NAME, ROUTES } from '../../config/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { loginSchema } from '../../schemas/loginSchema.js';
import { signInWithEmail } from '../../services/authService.js';
import { fetchUserProfile } from '../../services/userProfileService.js';
import { getAuthErrorMessage } from '../../utils/authErrors.js';
import { getDashboardRouteForRole } from '../../utils/roleRouting.js';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [submitError, setSubmitError] = useState(null);

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

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(getDashboardRouteForRole(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  async function onSubmit({ email, password }) {
    setSubmitError(null);

    try {
      const { user } = await signInWithEmail(email, password);

      if (!user) {
        throw new Error('Sign-in succeeded but no user was returned.');
      }

      const profile = await fetchUserProfile(user.id);
      navigate(getDashboardRouteForRole(profile.role), { replace: true });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-card__subtitle">Access your {APP_NAME} account</p>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isSubmitting}
              {...register('email')}
            />
          </FormField>

          <FormField id="password" label="Password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register('password')}
            />
          </FormField>

          {submitError ? (
            <p className="login-form__error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-card__footer">
          <Link to={ROUTES.HOME}>Back to home</Link>
        </p>
      </div>
    </div>
  );
}
