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
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-8">
      <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-emerald-500">
        Upload Local Video
      </h2>
      <div
        {...getRootProps()}
        className={`border-3 border-dashed rounded-xl p-12 text-center
                   transition-all duration-300 cursor-pointer
                   ${isDragActive 
                     ? 'border-emerald-400 bg-emerald-50' 
                     : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                   }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className={`h-16 w-16 mx-auto mb-4 transition-colors duration-300
                                    ${isDragActive ? 'text-emerald-500' : 'text-purple-400'}`} />
        {isDragActive ? (
          <p className="text-lg font-medium text-emerald-600">Drop it like it's hot! 🎵</p>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-medium text-purple-800">
              Drag & drop your video here
            </p>
            <p className="text-sm text-purple-600">
              or click to browse your files
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoUploader;