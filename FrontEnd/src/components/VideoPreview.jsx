import React from 'react';

function VideoPreview({ videoUrl }) {
  if (!videoUrl) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Video Preview</h2>
      <div className="aspect-w-16 aspect-h-9">
        <video
          className="w-full rounded-lg"
          controls
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export default VideoPreview;