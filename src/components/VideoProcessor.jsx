import React, { useState, useEffect } from 'react';
import ProcessingOptions from './ProcessingOptions';
import ClipResults from './ClipResults';
import VideoUrlInput from './VideoUrlInput';
import VideoUploader from './VideoUploader';
import ProcessingStatus from './ProcessingStatus';
import { processVideo, getProcessingStatusWithRetry } from '../lib/api';
import { useVideoLimits } from '../lib/useVideoLimits';
import useVideoStore from '../lib/useVideoStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { subscriptionPlans } from '../lib/stripe';
import useAuthStore from '../stores/authStore';
import '../styles/theme.css';

function VideoProcessor() {
  const [videoUrl, setVideoUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(null);
  const { checkVideoLimit, incrementUsage, monthlyUsage, refreshUsage, subscription } = useVideoLimits();
  const currentPlan = subscription?.subscription_tier || 'free';
  const clipLimit = subscriptionPlans[currentPlan]?.clipLimit || 3;
  const remainingClips = clipLimit - monthlyUsage;
  const { 
    clips, 
    highlightsUrl, 
    saveVideoResults, 
    loadVideoResults, 
    clearContent,
    isLoading,
    error 
  } = useVideoStore();
  const [processingOptions, setProcessingOptions] = useState({
    useTranscript: true,
    detectScenes: true,
    enhanceQuality: false,
  });
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Load saved video results when component mounts
  useEffect(() => {
    loadVideoResults();
  }, []);

  // Show error toast if video store has an error
  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  // Add effect to refresh usage when component mounts
  useEffect(() => {
    refreshUsage();
  }, []);

  const handleError = (error) => {
    setProcessing(false);
    setProcessingStage(null);
    
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
      
      if (status.message) {
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
        await saveVideoResults(status.clips || [], status.highlights);
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
    if (!canProcess) {
      navigate('/subscription');
      return;
    }
    
    // Clear previous results before starting new processing
    await clearContent();
    
    setProcessing(true);
    setProcessingStage('preparing');
    try {
      console.log('Sending request with user ID:', user?.id);
      const { jobId } = await processVideo(url, {
        ...processingOptions,
        user_id: user?.id
      });
      console.log('Got job ID:', jobId);
      checkStatus(jobId);
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(error.message || 'Failed to process video');
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
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-emerald-500">
          Video Processing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
            <p className="text-sm text-purple-400 uppercase tracking-wider">Current Plan</p>
            <p className="text-lg font-medium text-purple-900">
              {subscriptionPlans[currentPlan]?.name || 'Free'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
            <p className="text-sm text-purple-400 uppercase tracking-wider">Videos Created</p>
            <p className="text-lg font-medium text-purple-900">{monthlyUsage}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
            <p className="text-sm text-purple-400 uppercase tracking-wider">Videos Remaining</p>
            <p className="text-lg font-medium text-purple-900">{remainingClips}</p>
          </div>
        </div>
      </div>

      {processingStage && <ProcessingStatus currentStage={processingStage} />}

      <VideoUrlInput
        videoUrl={videoUrl}
        setVideoUrl={setVideoUrl}
        onSubmit={handleUrlSubmit}
        processing={processing}
      />

      <VideoUploader onUpload={handleFileUpload} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : clips.length > 0 && (
        <div className="animate-fadeIn">
          <ClipResults clips={clips} highlights={highlightsUrl} />
        </div>
      )}
    </div>
  );
}

export default VideoProcessor;