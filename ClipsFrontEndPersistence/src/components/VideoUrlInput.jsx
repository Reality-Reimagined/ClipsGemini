import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';

function VideoUrlInput({ videoUrl, setVideoUrl, onSubmit, processing }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(videoUrl);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Process Online Video</h2>
      <form onSubmit={handleSubmit} className="flex gap-4">
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Enter YouTube URL"
          className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={processing}
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 
                   disabled:bg-indigo-400 flex items-center gap-2"
        >
          <LinkIcon className="h-5 w-5" />
          {processing ? 'Processing...' : 'Process URL'}
        </button>
      </form>
    </div>
  );
}

export default VideoUrlInput;