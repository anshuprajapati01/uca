import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';

export default function NotFoundPage() {
  return (
    <main className="page">
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to={ROUTES.HOME}>Back to home</Link>
    </main>
  );
}
