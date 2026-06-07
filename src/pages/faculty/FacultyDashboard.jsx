import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants.js';

export default function FacultyDashboard() {
  return (
    <main className="page">
      <h1>Faculty Dashboard</h1>
      <p>Placeholder — faculty features will be added here.</p>
      <Link to={ROUTES.HOME}>Back to home</Link>
    </main>
  );
}
