import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../../components/common/FormField.jsx';
import { APP_NAME, ROUTES } from '../../config/constants.js';
import { loginSchema } from '../../schemas/loginSchema.js';
import { signInWithEmail } from '../../services/authService.js';
import { getAuthErrorMessage } from '../../utils/authErrors.js';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
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

  async function onSubmit({ email, password }) {
    setSubmitError(null);

    try {
      await signInWithEmail(email, password);
      navigate(ROUTES.HOME, { replace: true, state: { loginSuccess: true } });
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
