import React from 'react';
import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';

function ClipActions() {
  return (
    <div className="flex gap-2">
      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
        <PlayIcon className="h-5 w-5" />
      </button>
      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
        <ArrowDownTrayIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default ClipActions;