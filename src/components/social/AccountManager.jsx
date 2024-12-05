import React from 'react';
import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';

function AccountManager() {
  const accounts = [
    { platform: 'Facebook', connected: true, username: '@johndoe' },
    { platform: 'Instagram', connected: true, username: '@johndoe_gram' },
    { platform: 'Twitter', connected: false },
    { platform: 'YouTube', connected: true, username: 'John Doe Channel' },
  ];

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'Facebook':
        return <FaFacebook className="h-6 w-6 text-blue-600" />;
      case 'Instagram':
        return <FaInstagram className="h-6 w-6 text-pink-600" />;
      case 'Twitter':
        return <FaTwitter className="h-6 w-6 text-blue-400" />;
      case 'YouTube':
        return <FaYoutube className="h-6 w-6 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
        <div className="space-y-4">
          {accounts.map((account) => (
            <div
              key={account.platform}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                {getPlatformIcon(account.platform)}
                <div>
                  <h3 className="font-medium">{account.platform}</h3>
                  {account.connected && (
                    <p className="text-sm text-gray-500">{account.username}</p>
                  )}
                </div>
              </div>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  account.connected
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {account.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Platform</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
              <option>Facebook</option>
              <option>Instagram</option>
              <option>Twitter</option>
              <option>YouTube</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Auto-posting</label>
            <div className="mt-2 space-y-2">
              <label className="inline-flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                <span className="ml-2">Enable auto-posting to Facebook</span>
              </label>
              <label className="inline-flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                <span className="ml-2">Enable auto-posting to Instagram</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountManager;