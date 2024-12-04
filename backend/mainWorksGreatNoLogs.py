from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import google.generativeai as genai
from yt_dlp import YoutubeDL
import ffmpeg
from dotenv import load_dotenv
import uuid 
import logging
import time
import re

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--fc837ba8.local-credentialless.webcontainer-api.io"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini AI
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))

class VideoRequest(BaseModel):
    url: str
    options: dict

class ProcessingJob:
    def __init__(self):
        self.state = "processing"
        self.clips = []
        self.error = None

active_jobs = {}

def convert_timestamp_to_seconds(timestamp: str) -> int:
    """Convert MM:SS or HH:MM:SS format to seconds"""
    parts = timestamp.strip().split(':')
    if len(parts) == 2:  # MM:SS
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:  # HH:MM:SS
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    raise ValueError(f"Invalid timestamp format: {timestamp}")

def parse_gemini_response(response_text: str) -> list:
    """Parse Gemini's response into structured clip data"""
    logging.info("Starting to parse Gemini response...")
    clips = []
    current_clip = None
    
    for line in response_text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Remove markdown formatting if present
        line = line.replace('**', '')
            
        # Look for timestamp pattern (MM:SS - MM:SS)
        timestamp_match = re.search(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', line)
        if timestamp_match:
            if current_clip:
                clips.append(current_clip)
            
            start_str, end_str = timestamp_match.groups()
            try:
                current_clip = {
                    'start_time': convert_timestamp_to_seconds(start_str),
                    'end_time': convert_timestamp_to_seconds(end_str),
                    'description': '',
                    'viral_potential': 0,
                    'platforms': []
                }
                logging.debug(f"Found timestamp: {start_str} - {end_str}")
            except ValueError as e:
                logging.error(f"Error parsing timestamp: {e}")
                continue
        
        elif current_clip:
            # Handle description (might be on the same line after timestamp)
            if 'Description:' in line:
                current_clip['description'] = line.split('Description:', 1)[1].strip()
                logging.debug(f"Found description: {current_clip['description'][:50]}...")
            
            # Handle viral potential (now handles both "7" and "7/10" formats)
            elif 'Viral Potential:' in line:
                try:
                    potential_str = line.split('Viral Potential:', 1)[1].strip()
                    potential = int(potential_str.split('/')[0])  # Handle both "7" and "7/10"
                    current_clip['viral_potential'] = potential
                    logging.debug(f"Found viral potential: {potential}")
                except (ValueError, IndexError) as e:
                    logging.error(f"Error parsing viral potential: {e}")
                    
            # Handle platforms
            elif 'Best Platforms:' in line:
                platforms_str = line.split('Best Platforms:', 1)[1].strip()
                # Handle both comma-separated and space-separated platforms
                platforms = [p.strip(' ,') for p in re.split(r'[,\s]+', platforms_str) if p.strip(' ,')]
                current_clip['platforms'] = platforms
                logging.debug(f"Found platforms: {platforms}")
    
    # Don't forget to add the last clip
    if current_clip:
        clips.append(current_clip)
    
    logging.info(f"Found {len(clips)} clips in Gemini response")
    if not clips:
        logging.warning("No clips were parsed from the response")
        logging.debug("Response may not be in expected format")
    
    return clips

def process_video_task(job_id: str, url: str, options: dict):
    """Main video processing task"""
    job = active_jobs[job_id]
    video_path = None
    video_file = None
    
    try:
        # Download video
        logging.info("Starting video download...")
        ydl_opts = {
            'format': 'best',
            'quiet': True,
            'no_warnings': True,
            'outtmpl': f'downloads/{job_id}_%(title)s.%(ext)s'
        }
        
        os.makedirs('downloads', exist_ok=True)
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)
            logging.info(f"Video downloaded: {video_path}")

        # Upload to Gemini
        logging.info("Uploading to Gemini...")
        video_file = genai.upload_file(path=video_path)
        
        # Wait for processing
        while video_file.state.name == "PROCESSING":
            logging.info("Waiting for Gemini processing...")
            time.sleep(5)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name != "ACTIVE":
            raise Exception(f"Video processing failed: {video_file.state.name}")

        # Generate content with Gemini
        logging.info("Analyzing video content...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """Analyze this video and identify 3-5 of the most engaging moments.
        For each moment, provide the information in EXACTLY this format (see example below):

        MM:SS - MM:SS
        Description: [Describe what happens in this clip]
        Viral Potential: [Rate from 1-10]
        Best Platforms: [List suitable social platforms]

        Example format:
        0:15 - 0:45
        Description: Person explains the key concept with a surprising revelation
        Viral Potential: 8
        Best Platforms: TikTok, Instagram Reels, YouTube Shorts

        Keep clips between 15-60 seconds long.
        Focus on moments that would be engaging on social media.
        Do not use any markdown formatting in your response."""

        logging.info("Sending prompt to Gemini:")
        logging.info(f"Prompt:\n{prompt}")

        response = model.generate_content(
            [video_file, prompt],
            request_options={"timeout": 600}
        )
        
        # Parse clips from response
        clips = parse_gemini_response(response.text)
        if not clips:
            raise Exception("No valid clips identified")
        
        # Create clips directory
        os.makedirs('clips', exist_ok=True)
        
        # Process each clip
        processed_clips = []
        for i, clip in enumerate(clips):
            try:
                output_path = f"clips/{job_id}_clip_{i}.mp4"
                duration = clip['end_time'] - clip['start_time']
                
                # Use FFmpeg to create clip
                ffmpeg.input(video_path, ss=clip['start_time'], t=duration) \
                      .output(output_path, acodec='copy', vcodec='copy') \
                      .overwrite_output() \
                      .run(capture_stdout=True, capture_stderr=True)
                
                clip['url'] = output_path
                processed_clips.append(clip)
                logging.info(f"Processed clip {i+1}/{len(clips)}")
                
            except Exception as e:
                logging.error(f"Error processing clip {i}: {e}")
                continue
        
        if not processed_clips:
            raise Exception("Failed to process any clips")
        
        job.clips = processed_clips
        job.state = "completed"
        logging.info("Processing completed successfully")
        
    except Exception as e:
        job.state = "failed"
        job.error = str(e)
        logging.error(f"Processing failed: {e}")
        
    finally:
        # Cleanup
        try:
            if video_file:
                genai.delete_file(video_file.name)
            if video_path and os.path.exists(video_path):
                os.remove(video_path)
        except Exception as e:
            logging.error(f"Cleanup error: {e}")

@app.post("/process-video")
async def process_video(request: VideoRequest, background_tasks: BackgroundTasks):
    """Endpoint to start video processing"""
    job_id = str(uuid.uuid4())
    active_jobs[job_id] = ProcessingJob()
    
    background_tasks.add_task(
        process_video_task,
        job_id,
        request.url,
        request.options
    )
    
    return {"jobId": job_id}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    """Endpoint to check processing status"""
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "state": job.state,
        "clips": job.clips if job.state == "completed" else [],
        "error": job.error if job.state == "failed" else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)