import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';

function VideoUrlInput({ videoUrl, setVideoUrl, onSubmit, processing }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(videoUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Paste your YouTube URL here"
          className="flex-1 p-4 bg-white rounded-xl border-2 border-purple-200 
                   focus:border-purple-400 focus:ring-4 focus:ring-purple-100 
                   transition-all duration-200 text-purple-900 placeholder:text-purple-300 
                   text-lg shadow-sm"
          disabled={processing}
        />
        <button
          type="submit"
          disabled={processing || !videoUrl}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-emerald-500 
                   text-white rounded-xl hover:from-purple-700 hover:to-emerald-600
                   disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed 
                   transition-all duration-200 font-medium text-lg shadow-md 
                   hover:shadow-lg transform hover:-translate-y-0.5"
        >
          {processing ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Processing</span>
            </span>
          ) : (
            'Generate Clips'
          )}
        </button>
      </div>
    </form>
  );
}

export default VideoUrlInput;