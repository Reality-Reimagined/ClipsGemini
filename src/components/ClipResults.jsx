import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';
import ClipItem from './ClipItem';

function ClipResults({ clips, highlights }) {
  const [activePreview, setActivePreview] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    console.log('Highlights received:', highlights);
  }, [highlights]);

  const loadVideo = async (url) => {
    try {
      console.log('Loading video from URL:', url);
      const response = await fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      setVideoUrl(blobUrl);
      setActivePreview(true);
    } catch (error) {
      console.error('Video loading error:', error);
    }
  };

  const handleHighlightsDownload = async () => {
    try {
      console.log('Downloading highlights from:', highlights);
      const response = await fetch(highlights, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'highlights.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-emerald-500">
        Generated Clips
      </h2>

      {/* Highlights Section */}
      {highlights && (
        <div className="mb-6 p-6 bg-white rounded-xl shadow-md border border-purple-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-purple-800">Highlights Reel</h3>
              <p className="text-gray-600">
                Combined highlights from most viral moments
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => loadVideo(highlights)}
                className="p-3 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors duration-200
                         flex items-center gap-2 font-medium"
                title="Play highlights"
              >
                <PlayIcon className="h-5 w-5" />
                Play
              </button>
              <button
                onClick={handleHighlightsDownload}
                className="p-3 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors duration-200
                         flex items-center gap-2 font-medium"
                title="Download highlights"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {activePreview && videoUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl">
            <div className="relative pt-[56.25%]">
              <video
                src={videoUrl}
                controls
                className="absolute inset-0 w-full h-full rounded-lg"
                autoPlay
              />
            </div>
            <button
              onClick={() => {
                setActivePreview(false);
                setVideoUrl(null);
              }}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                       transition-colors duration-200"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Individual Clips */}
      <div className="space-y-6">
        {clips.map((clip, index) => (
          <ClipItem
            key={index}
            clip={clip}
            index={index}
            onPlay={() => loadVideo(clip.url)}
          />
        ))}
      </div>
    </div>
  );
}

export default ClipResults;