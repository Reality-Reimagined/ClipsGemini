import React from 'react';
import { Switch } from '@headlessui/react';

function ProcessingOptions() {
  const [options, setOptions] = React.useState({
    useTranscript: true,
    detectScenes: true,
    enhanceQuality: false,
  });

  const toggleOption = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Processing Options</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Use Transcript Analysis</h3>
            <p className="text-sm text-gray-500">Use video transcript for content analysis</p>
          </div>
          <Switch
            checked={options.useTranscript}
            onChange={() => toggleOption('useTranscript')}
            className={`${
              options.useTranscript ? 'bg-indigo-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className={`${
              options.useTranscript ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`} />
          </Switch>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Scene Detection</h3>
            <p className="text-sm text-gray-500">Automatically detect scene changes</p>
          </div>
          <Switch
            checked={options.detectScenes}
            onChange={() => toggleOption('detectScenes')}
            className={`${
              options.detectScenes ? 'bg-indigo-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className={`${
              options.detectScenes ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`} />
          </Switch>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Enhance Quality</h3>
            <p className="text-sm text-gray-500">Apply quality enhancement to clips</p>
          </div>
          <Switch
            checked={options.enhanceQuality}
            onChange={() => toggleOption('enhanceQuality')}
            className={`${
              options.enhanceQuality ? 'bg-indigo-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full`}
          >
            <span className={`${
              options.enhanceQuality ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition`} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

export default ProcessingOptions;