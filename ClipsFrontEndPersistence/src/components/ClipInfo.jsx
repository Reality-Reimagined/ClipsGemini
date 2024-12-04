import React from 'react';

function ClipInfo({ index, startTime, endTime }) {
  return (
    <div>
      <h3 className="font-medium">Clip {index + 1}</h3>
      <p className="text-sm text-gray-500">
        {startTime} - {endTime}
      </p>
    </div>
  );
}

export default ClipInfo;