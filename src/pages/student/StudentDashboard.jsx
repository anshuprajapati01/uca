import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';

export default function StudentDashboard() {
  return (
    <main className="page">
      <h1>Student Dashboard</h1>
      <p>Placeholder — student features will be added here.</p>
      <Link to={ROUTES.HOME}>Back to home</Link>
    </main>
  );
}
