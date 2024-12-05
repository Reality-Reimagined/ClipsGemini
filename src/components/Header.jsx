import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { VideoCameraIcon } from '@heroicons/react/24/solid';
import useAuthStore from '../stores/authStore';

function Header() {
  const { user, signOut } = useAuthStore();
  const location = useLocation();

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <VideoCameraIcon className="h-8 w-8 text-indigo-600" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">
              Video Clip Generator
            </h1>
          </Link>
          
          {user && (
            <nav className="flex items-center space-x-6">
              <Link
                to="/"
                className={`text-gray-600 hover:text-gray-900 ${
                  location.pathname === '/' ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                Home
              </Link>
              <Link
                to="/social"
                className={`text-gray-600 hover:text-gray-900 ${
                  location.pathname === '/social' ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                Social
              </Link>
              <Link
                to="/subscription"
                className={`text-gray-600 hover:text-gray-900 ${
                  location.pathname === '/subscription' ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                Subscription
              </Link>
              <Link
                to="/settings"
                className={`text-gray-600 hover:text-gray-900 ${
                  location.pathname === '/settings' ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                Settings
              </Link>
              <button
                onClick={signOut}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
export default Header;