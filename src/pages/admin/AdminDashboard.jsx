import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';

export default function AdminDashboard() {
  return (
    <main className="page">
      <h1>Admin Dashboard</h1>
      <p>Placeholder — admin features will be added here.</p>
      <Link to={ROUTES.HOME}>Back to home</Link>
    </main>
  );
}
