import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const stages = [
  { id: 'preparing', label: 'Preparing Video' },
  { id: 'generating', label: 'Generating Analysis' },
  { id: 'creating', label: 'Creating Clips' },
  { id: 'cleaning', label: 'Cleaning Up' }
];

function ProcessingStatus({ currentStage }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Processing Status</h2>
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isComplete = stages.findIndex(s => s.id === currentStage) > index;
          
          return (
            <div 
              key={stage.id}
              className={`flex items-center space-x-3 transition-all duration-300
                ${isActive ? 'scale-105' : 'scale-100'}
                ${isComplete ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div className="flex-shrink-0">
                {isComplete ? (
                  <CheckCircleIcon className="h-6 w-6 animate-scale" />
                ) : isActive ? (
                  <ArrowPathIcon className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-current" />
                )}
              </div>
              <div className="flex-grow">
                <p className="font-medium">{stage.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessingStatus; 