import React from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

function VideoUploader({ onUpload }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onUpload,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv']
    }
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Upload Local Video</h2>
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center
                   hover:border-indigo-500 transition-colors cursor-pointer"
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
        {isDragActive ? (
          <p className="mt-2 text-indigo-600">Drop the video here...</p>
        ) : (
          <p className="mt-2 text-gray-600">
            Drag & drop a video file here, or click to select
          </p>
        )}
      </div>
    </div>
  );
}

export default VideoUploader;