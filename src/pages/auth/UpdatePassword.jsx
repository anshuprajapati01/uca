import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FormField from '../../components/common/FormField.jsx';
import { ROUTES } from '../../config/constants.js';
import { supabase } from '../../lib/supabase.js';
import './UpdatePassword.css';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ has_changed_password: true })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success('Password updated successfully');
      await supabase.auth.signOut();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      toast.error('Failed to update password: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="update-password-page">
      <div className="update-password-card">
        <h1>Set New Password</h1>
        <p className="update-password-card__subtitle">
          Enter a new password for your account
        </p>

        <form
          className="update-password-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <FormField id="password" label="New Password" error={errors.password?.message}>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register('password', {
                required: 'New password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
          </FormField>

          <FormField
            id="confirmPassword"
            label="Confirm New Password"
            error={errors.confirmPassword?.message}
          >
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
              })}
            />
          </FormField>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
