import React from 'react';
import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';

function ClipItem({ clip, index, onPlay }) {
  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(clip.url, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clip_${index + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg hover:border-indigo-200 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">Clip {index + 1}</h3>
          <p className="text-gray-600 mt-1">{clip.description}</p>
          {clip.viral_potential && (
            <span className="inline-block mt-2 text-sm px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
              Viral Potential: {clip.viral_potential}/10
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPlay(clip.url)}
            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
          >
            <PlayIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClipItem;