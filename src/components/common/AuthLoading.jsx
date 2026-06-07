import { APP_NAME } from '../../config/constants.js';

export default function AuthLoading() {
  return (
    <div className="auth-loading">
      <p>Loading {APP_NAME}…</p>
    </div>
  );
}
