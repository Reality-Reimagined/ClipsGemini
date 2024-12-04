import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ProcessingOptions from './ProcessingOptions';
import VideoPreview from './VideoPreview';
import ClipResults from './ClipResults';
import VideoUrlInput from './VideoUrlInput';
import VideoUploader from './VideoUploader';
import ProcessingStatus from './ProcessingStatus';
import { processVideo, getProcessingStatusWithRetry } from '../lib/api';
import { useVideoLimits } from '../lib/useVideoLimits';
import toast from 'react-hot-toast';

function VideoProcessor() {
  const [videoUrl, setVideoUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(null);
  const [clips, setClips] = useState([]);
  const [highlightsUrl, setHighlightsUrl] = useState(null);
  const { checkVideoLimit, incrementUsage, monthlyUsage } = useVideoLimits();
  const [processingOptions, setProcessingOptions] = useState({
    useTranscript: true,
    detectScenes: true,
    enhanceQuality: false,
  });

  const handleError = (error) => {
    setProcessing(false);
    setProcessingStage(null);
    
    // Handle specific error types
    if (error.message === 'INTERNAL_ERROR') {
      toast.error('Server encountered an error. Please try again later.');
    } else if (error.message === 'PROCESSING_FAILED') {
      toast.error('Video processing failed. Please try a different video.');
    } else if (error.message.includes('retry')) {
      toast.error('Lost connection to server');
    } else {
      toast.error('An error occurred while processing the video');
    }
  };

  const checkStatus = async (jobId) => {
    try {
      const status = await getProcessingStatusWithRetry(jobId);
      console.log('Status update:', status);
      
      if (status.message) {
        console.log('Current message:', status.message);
        
        if (status.message.includes('Starting video download')) {
          setProcessingStage('preparing');
        } else if (status.message.includes('Analyzing video content') || status.message.includes('Sending prompt to Gemini')) {
          setProcessingStage('generating');
        } else if (status.message.includes('Processing clip') || status.message.includes('Creating highlights')) {
          setProcessingStage('creating');
        } else if (status.message.includes('Cleaning up files')) {
          setProcessingStage('cleaning');
        }
      }

      if (status.state === 'completed') {
        console.log('Processing completed with status:', status);
        setClips(status.clips || []);
        if (status.highlights) {
          console.log('Highlights found:', status.highlights);
          setHighlightsUrl(status.highlights);
        }
        try {
          await incrementUsage();
        } catch (error) {
          console.error('Failed to increment usage count:', error);
        }
        setProcessingStage(null);
        setProcessing(false);
        toast.success('Video processed successfully!');
        return;
      } else {
        console.log('Continuing to poll status...');
        setTimeout(() => checkStatus(jobId), 2000);
      }
    } catch (error) {
      console.error('Status check failed:', error);
      handleError(error);
      return;
    }
  };

  const handleUrlSubmit = async (url) => {
    if (!url) {
      toast.error('Please enter a video URL');
      return;
    }

    const canProcess = await checkVideoLimit();
    if (!canProcess) return;
    
    setProcessing(true);
    setProcessingStage('preparing');
    try {
      const { jobId } = await processVideo(url, processingOptions);
      console.log('Started processing with jobId:', jobId);
      
      // Start polling
      console.log('Starting status polling');
      checkStatus(jobId);
      
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(error.message);
      setProcessing(false);
      setProcessingStage(null);
    }
  };

  const handleFileUpload = async (files) => {
    const canProcess = await checkVideoLimit();
    if (!canProcess) return;
    
    toast.error('Local file processing will be implemented in the backend');
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Video Processing</h2>
        <p className="text-gray-600 mb-4">
          Videos remaining this month: {3 - monthlyUsage}
        </p>
      </div>

      {processingStage && <ProcessingStatus currentStage={processingStage} />}

      <VideoUrlInput 
        videoUrl={videoUrl}
        setVideoUrl={setVideoUrl}
        onSubmit={handleUrlSubmit}
        processing={processing}
      />
      
      <VideoUploader onUpload={handleFileUpload} />
      
      <ProcessingOptions 
        options={processingOptions}
        setOptions={setProcessingOptions}
      />
      
      {clips.length > 0 && (
        <div className="animate-fadeIn">
          <ClipResults 
            clips={clips} 
            highlights={highlightsUrl}
          />
        </div>
      )}
    </div>
  );
}

export default VideoProcessor;