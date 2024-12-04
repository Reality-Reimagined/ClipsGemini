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
    allow_origins=["http://localhost:5173", "https://sb1tjeckc-sayr--5173--fc837ba8.local-corp.webcontainer.io", "https://boisterous-treacle-a2525d.netlify.app"],
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
                # Add 1 second to the end time
                end_seconds = convert_timestamp_to_seconds(end_str) + 1
                current_clip = {
                    'start_time': convert_timestamp_to_seconds(start_str),
                    'end_time': end_seconds,
                    'original_end': end_str,  # Keep original for reference
                    'description': '',
                    'viral_potential': 0,
                    'platforms': []
                }
                logging.debug(f"Found timestamp: {start_str} - {end_str} (adjusted end to +1 second)")
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

def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename and make it filesystem safe"""
    # Remove or replace invalid characters
    invalid_chars = r'<>:"/\|?*'
    # Replace special characters with underscore
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Replace multiple spaces/underscores with single underscore
    filename = re.sub(r'[\s_]+', '_', filename)
    
    # Remove any non-ASCII characters
    filename = re.sub(r'[^\x00-\x7F]+', '', filename)
    
    # Trim length if needed (Windows has 255 char limit)
    if len(filename) > 200:  # Leave room for additional chars
        filename = filename[:200]
    
    return filename.strip('_')  # Remove leading/trailing underscores

def cleanup_gemini_files():
    """Clean up any lingering files from Gemini"""
    try:
        logging.info("Checking for files to clean up in Gemini...")
        for f in genai.list_files():
            try:
                logging.info(f"Deleting Gemini file: {f.name}")
                genai.delete_file(f.name)
            except Exception as e:
                logging.error(f"Error deleting Gemini file {f.name}: {e}")
    except Exception as e:
        logging.error(f"Error listing Gemini files: {e}")

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
            video_title = sanitize_filename(info.get('title', 'unknown_video'))
            logging.info(f"Video downloaded: {video_path}")

        # Create a dedicated folder for this video's clips
        video_folder = f"clips/{video_title}_{job_id}"
        os.makedirs(video_folder, exist_ok=True)
        
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
        prompt = """Analyze this video and identify the most engaging moments.
        For each moment, provide the information in EXACTLY this format (see example below):

        MM:SS - MM:SS
        Description: [Describe what happens in this clip]
        Viral Potential: [Rate from 1-10]
        Best Platforms: [List suitable social platforms]

        Example format:
        2:15 - 3:45
        Description: Person explains the key concept with a surprising revelation
        Viral Potential: 8
        Best Platforms: TikTok, Instagram Reels, YouTube Shorts

        Keep clips between 1-5 minutes long. 
        Let them make sense in context of the video.
        Focus on moments that would be engaging on social media.
        Do not use any markdown formatting in your response."""

        logging.info("Sending prompt to Gemini:")
        logging.info(f"Prompt:\n{prompt}")

        response = model.generate_content(
            [video_file, prompt],
            request_options={"timeout": 600}
        )

        logging.info("Received response from Gemini:")
        logging.info(f"Response:\n{response.text}")

        # Save Gemini's response as markdown
        analysis_path = os.path.join(video_folder, "analysis.md")
        with open(analysis_path, 'w', encoding='utf-8') as f:
            f.write(f"# AI Analysis for: {video_title}\n\n")
            f.write(f"Job ID: {job_id}\n")
            f.write(f"Analysis Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## Identified Clips\n\n")
            f.write(response.text)
        
        # Parse clips from response
        clips = parse_gemini_response(response.text)
        if not clips:
            raise Exception("No valid clips identified")
        
        # Process each clip
        processed_clips = []
        for i, clip in enumerate(clips):
            try:
                # Create clip filename using timestamp
                clip_filename = f"clip_{i+1}_{clip['start_time']}_{clip['end_time']}.mp4"
                output_path = os.path.join(video_folder, clip_filename)
                
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
            # Clean up the specific video file if we have it
            if video_file:
                try:
                    logging.info(f"Deleting Gemini file: {video_file.name}")
                    genai.delete_file(video_file.name)
                except Exception as e:
                    logging.error(f"Error deleting specific Gemini file: {e}")
            
            # Clean up any other lingering files
            cleanup_gemini_files()
            
            # Clean up local video file
            if video_path and os.path.exists(video_path):
                os.remove(video_path)
                logging.info(f"Deleted local video file: {video_path}")
                
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