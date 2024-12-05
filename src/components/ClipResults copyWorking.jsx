import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';
import ClipItem from './ClipItem';

function ClipResults({ clips, highlights }) {
  const [activePreview, setActivePreview] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // Debug log to see what we're receiving
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
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Generated Clips</h2>

      {/* Highlights Section */}
      {highlights && (
        <div className="mb-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
          <h3 className="text-lg font-medium mb-2">Highlights Reel</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                Combined highlights from most viral moments
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadVideo(highlights)}
                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
                title="Play highlights"
              >
                <PlayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleHighlightsDownload}
                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
                title="Download highlights"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {activePreview && videoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-4">
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
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Individual Clips */}
      <div className="space-y-4">
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

export default ClipResults

// import React, { useState, useEffect } from 'react';
// import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';
// import ClipItem from './ClipItem';

// function ClipResults({ clips, highlights }) {
//   const [activePreview, setActivePreview] = useState(null);
//   const [videoUrl, setVideoUrl] = useState(null);

//   // Debug log to see what we're receiving
//   useEffect(() => {
//     console.log('Highlights received:', highlights);
//   }, [highlights]);

//   const loadVideo = async (url) => {
//     try {
//       console.log('Loading video from URL:', url);
//       const response = await fetch(url, {
//         headers: {
//           'ngrok-skip-browser-warning': 'true',
//         },
//       });
//       const blob = await response.blob();
//       const blobUrl = window.URL.createObjectURL(blob);
//       setVideoUrl(blobUrl);
//       setActivePreview(true);
//     } catch (error) {
//       console.error('Video loading error:', error);
//     }
//   };

//   const handleHighlightsDownload = async () => {
//     try {
//       console.log('Downloading highlights from:', highlights);
//       const response = await fetch(highlights, {
//         headers: {
//           'ngrok-skip-browser-warning': 'true',
//         },
//       });
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = 'highlights.mp4';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error('Download error:', error);
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow">
//       <h2 className="text-xl font-semibold mb-4">Generated Clips</h2>

//       {/* Highlights Section */}
//       {highlights && (
//         <div className="mb-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
//           <h3 className="text-lg font-medium mb-2">Highlights Reel</h3>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-gray-600">
//                 Combined highlights from most viral moments
//               </p>
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => loadVideo(highlights)}
//                 className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
//                 title="Play highlights"
//               >
//                 <PlayIcon className="h-5 w-5" />
//               </button>
//               <button
//                 onClick={handleHighlightsDownload}
//                 className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
//                 title="Download highlights"
//               >
//                 <ArrowDownTrayIcon className="h-5 w-5" />
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Video Preview Modal */}
//       {activePreview && videoUrl && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg max-w-4xl w-full p-4">
//             <div className="relative pt-[56.25%]">
//               <video
//                 src={videoUrl}
//                 controls
//                 className="absolute inset-0 w-full h-full rounded-lg"
//                 autoPlay
//               />
//             </div>
//             <button
//               onClick={() => {
//                 setActivePreview(false);
//                 setVideoUrl(null);
//               }}
//               className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Individual Clips */}
//       <div className="space-y-4">
//         {clips.map((clip, index) => (
//           <ClipItem
//             key={index}
//             clip={clip}
//             index={index}
//             onPlay={() => loadVideo(clip.url)}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }

// export default ClipResults;


// import React, { useState, useEffect } from 'react';
// import { ArrowDownTrayIcon, PlayIcon } from '@heroicons/react/24/outline';
// import ClipItem from './ClipItem';

// function ClipResults({ clips, highlights }) {
//   const [activePreview, setActivePreview] = useState(null);
//   const [videoUrl, setVideoUrl] = useState(null);

//   // Debug log to see what we're receiving
//   useEffect(() => {
//     console.log('Highlights received:', highlights);
//   }, [highlights]);

//   const loadVideo = async (url) => {
//     try {
//       console.log('Loading video from URL:', url);
      
//       // Add ngrok headers to URL
//       const videoUrlWithHeaders = new URL(url);
//       videoUrlWithHeaders.searchParams.append('ngrok-skip-browser-warning', 'true');
      
//       // Just set the URL directly
//       setVideoUrl(videoUrlWithHeaders.toString());
      
//     } catch (error) {
//       console.error('Video loading error:', error);
//     }
//   };

//   const handleHighlightsDownload = async () => {
//     try {
//       console.log('Downloading highlights from:', highlights);
      
//       // Create download link
//       const link = document.createElement('a');
//       link.href = highlights;
//       link.download = 'highlights.mp4';
//       link.target = '_blank';  // Open in new tab if direct download fails
      
//       // Add ngrok header
//       link.setAttribute('data-ngrok-skip-browser-warning', 'true');
      
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
      
//     } catch (error) {
//       console.error('Download error:', error);
//     }
//   };

//   return (
//     <div className="bg-white p-6 rounded-lg shadow">
//       <h2 className="text-xl font-semibold mb-4">Generated Clips</h2>

//       {/* Highlights Section */}
//       {highlights && (
//         <div className="mb-6 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
//           <h3 className="text-lg font-medium mb-2">Highlights Reel</h3>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-gray-600">
//                 Combined highlights from most viral moments
//               </p>
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={() => loadVideo(highlights)}
//                 className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
//                 title="Play highlights"
//               >
//                 <PlayIcon className="h-5 w-5" />
//               </button>
//               <button
//                 onClick={handleHighlightsDownload}
//                 className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"
//                 title="Download highlights"
//               >
//                 <ArrowDownTrayIcon className="h-5 w-5" />
//               </button>
//             </div>
//           </div>
//           <video 
//             controls 
//             src={videoUrl}
//             style={{ maxWidth: '100%' }}
//             crossOrigin="anonymous"
//           >
//             Your browser does not support the video tag.
//           </video>
//         </div>
//       )}

//       {/* Individual Clips */}
//       <div className="space-y-4">
//         {clips.map((clip, index) => (
//           <ClipItem
//             key={index}
//             clip={clip}
//             index={index}
//             onPlay={() => loadVideo(clip.url)}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }

// export default ClipResults;