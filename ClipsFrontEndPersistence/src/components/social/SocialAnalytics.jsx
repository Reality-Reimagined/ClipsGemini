import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function SocialAnalytics() {
  const analyticsData = [
    { platform: 'Facebook', views: 1200, likes: 450, shares: 200 },
    { platform: 'Instagram', views: 2300, likes: 890, shares: 300 },
    { platform: 'Twitter', views: 1800, likes: 670, shares: 400 },
    { platform: 'YouTube', views: 3500, likes: 1200, shares: 600 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-blue-700">Total Views</h3>
            <p className="text-3xl font-bold text-blue-900">8,800</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-green-700">Total Likes</h3>
            <p className="text-3xl font-bold text-green-900">3,210</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-purple-700">Total Shares</h3>
            <p className="text-3xl font-bold text-purple-900">1,500</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Platform Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Likes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.map((platform) => (
                <tr key={platform.platform}>
                  <td className="px-6 py-4 whitespace-nowrap">{platform.platform}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{platform.views}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{platform.likes}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{platform.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SocialAnalytics;