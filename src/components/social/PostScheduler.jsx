import React, { useState } from 'react';
import { Calendar } from 'react-big-calendar';
import DatePicker from 'react-datepicker';
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

function PostScheduler() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    platform: '',
    date: new Date(),
  });

  const handleSchedulePost = (e) => {
    e.preventDefault();
    setScheduledPosts([...scheduledPosts, { ...newPost, id: Date.now() }]);
    setNewPost({ title: '', platform: '', date: new Date() });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Schedule New Post</h2>
        <form onSubmit={handleSchedulePost} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Post Title</label>
            <input
              type="text"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Platform</label>
            <select
              value={newPost.platform}
              onChange={(e) => setNewPost({ ...newPost, platform: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Platform</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date and Time</label>
            <DatePicker
              selected={newPost.date}
              onChange={(date) => setNewPost({ ...newPost, date })}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Schedule Post
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Scheduled Posts</h2>
        <div className="space-y-4">
          {scheduledPosts.map((post) => (
            <div key={post.id} className="border p-4 rounded-lg">
              <h3 className="font-medium">{post.title}</h3>
              <p className="text-sm text-gray-500">
                Platform: {post.platform}
              </p>
              <p className="text-sm text-gray-500">
                Scheduled for: {format(post.date, 'PPpp')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PostScheduler;