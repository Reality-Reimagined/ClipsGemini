import axios from 'axios';

const API_BASE_URL = 'http://localhost:5050';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const API_URL = 'https://super-sloth-deep.ngrok-free.app'; // your ngrok URL

// Helper function to ensure full URLs
const getFullUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const processVideo = async (url, options) => {
  try {
    const response = await fetch(`${API_URL}/process-video`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url, options }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Process video error response:', errorText);
      throw new Error('Failed to start video processing');
    }
    
    const data = await response.json();
    console.log('Process video response:', data);
    return data;
  } catch (error) {
    console.error('Process video error:', error);
    throw error;
  }
};

// Update the headers to include ngrok skip
const headers = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

export const getProcessingStatus = async (jobId) => {
  try {
    const response = await fetch(`${API_URL}/status/${jobId}`, {
      headers: headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Status error response:', errorText);
      if (response.status === 500) {
        throw new Error('INTERNAL_ERROR');
      }
      throw new Error(`Failed to get processing status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert relative URLs to full URLs
    if (data.clips) {
      data.clips = data.clips.map(clip => ({
        ...clip,
        url: getFullUrl(clip.url)
      }));
    }
    
    if (data.highlights) {
      data.highlights = getFullUrl(data.highlights);
    }
    
    if (data.state === 'failed') {
      throw new Error(data.error || 'PROCESSING_FAILED');
    }
    
    console.log('Status response:', data);
    return data;
  } catch (error) {
    console.error('Get status error:', error);
    throw error;
  }
};

export const getProcessingStatusWithRetry = async (jobId, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getProcessingStatus(jobId);
    } catch (error) {
      console.log(`Retry ${i + 1}/${maxRetries} failed`);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
};

export const getClipPreview = async (clipId) => {
  try {
    const response = await api.get(`/clips/${clipId}/preview`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get clip preview');
  }
};