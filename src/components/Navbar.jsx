import { Link, useLocation } from 'react-router-dom';
import '../styles/theme.css';

function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md border-b border-indigo-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <Link to="/" className="flex items-center">
            <span className="gradient-text text-2xl font-bold">
              ClipMaster
            </span>
          </Link>
          
          <div className="hidden sm:flex sm:space-x-4">
            <NavLink to="/" isActive={isActive('/')}>Home</NavLink>
            <NavLink to="/social" isActive={isActive('/social')}>Social</NavLink>
            <NavLink to="/subscription" isActive={isActive('/subscription')}>Subscription</NavLink>
            <NavLink to="/settings" isActive={isActive('/settings')}>Settings</NavLink>
          </div>
          
          <button className="gradient-button px-4 py-2">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

// Helper component for nav links
function NavLink({ to, children, isActive }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg
                 transition-colors duration-200
                 ${isActive 
                   ? 'text-purple-600 bg-purple-50' 
                   : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                 }`}
    >
      {children}
    </Link>
  );
}

export default Navbar; 