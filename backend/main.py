
# ** works great dont change it**

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import os
import google.generativeai as genai
from yt_dlp import YoutubeDL
import ffmpeg
from dotenv import load_dotenv
import uuid 
import logging
import time
import re
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

# Mount the clips directory to serve files
app.mount("/clips", StaticFiles(directory="clips"), name="clips")

class VideoRequest(BaseModel):
    url: str
    options: Dict = {}

class ProcessingJob:
    def __init__(self):
        self.state = "processing"
        self.clips = []
        self.highlights = None
        self.error = None
        self.message = None

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
            # Handle description
            if 'Description:' in line:
                current_clip['description'] = line.split('Description:', 1)[1].strip()
            
            # Handle viral potential
            elif 'Viral Potential:' in line:
                try:
                    potential_str = line.split('Viral Potential:', 1)[1].strip()
                    potential = int(potential_str.split('/')[0])
                    current_clip['viral_potential'] = potential
                except (ValueError, IndexError) as e:
                    logging.error(f"Error parsing viral potential: {e}")
                    
            # Handle platforms
            elif 'Best Platforms:' in line:
                platforms_str = line.split('Best Platforms:', 1)[1].strip()
                platforms = [p.strip(' ,') for p in re.split(r'[,\s]+', platforms_str) if p.strip(' ,')]
                current_clip['platforms'] = platforms
    
    # Don't forget to add the last clip
    if current_clip:
        clips.append(current_clip)
    
    return clips

def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename"""
    invalid_chars = r'<>:"/\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    filename = re.sub(r'[\s_]+', '_', filename)
    filename = re.sub(r'[^\x00-\x7F]+', '', filename)
    if len(filename) > 200:
        filename = filename[:200]
    return filename.strip('_')

def create_highlights_reel(video_folder: str, clips: list, min_viral_potential: int = 7):
    """Create a highlights reel from clips with high viral potential"""
    try:
        logging.info(f"Creating highlights reel from clips with viral potential >= {min_viral_potential}")
        
        highlight_clips = [clip for clip in clips if clip['viral_potential'] >= min_viral_potential]
        highlight_clips.sort(key=lambda x: x['start_time'])
        
        if not highlight_clips:
            logging.info("No clips meet the viral potential threshold")
            return None
            
        highlights_path = os.path.join(video_folder, "highlights.mp4")
        
        # Create concat file
        concat_file = os.path.join(video_folder, "concat_list.txt")
        with open(concat_file, 'w', encoding='utf-8') as f:
            for clip in highlight_clips:
                safe_path = os.path.abspath(clip['url']).replace('\\', '/')
                f.write(f"file '{safe_path}'\n")
        
        logging.info(f"Concatenating {len(highlight_clips)} clips for highlights reel")
        
        try:
            ffmpeg.input(concat_file, format='concat', safe=0) \
                  .output(highlights_path, c='copy') \
                  .overwrite_output() \
                  .run(capture_stdout=True, capture_stderr=True)
                  
            logging.info(f"Successfully created highlights reel: {highlights_path}")
            return highlights_path
            
        except ffmpeg.Error as e:
            logging.error(f"FFmpeg error: {e.stderr.decode() if e.stderr else 'No stderr'}")
            return None
            
    except Exception as e:
        logging.error(f"Error creating highlights reel: {str(e)}")
        return None
    finally:
        if 'concat_file' in locals() and os.path.exists(concat_file):
            os.remove(concat_file)

def process_video_task(job_id: str, url: str, options: dict):
    """Main video processing task"""
    job = active_jobs[job_id]
    video_path = None
    
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

        # Create video folder
        video_folder = f"clips/{video_title}_{job_id}"
        os.makedirs(video_folder, exist_ok=True)
        
        # Upload to Gemini
        logging.info("Uploading to Gemini...")
        video_file = genai.upload_file(path=video_path)
        
        while video_file.state.name == "PROCESSING":
            logging.info("Waiting for Gemini processing...")
            time.sleep(5)
            video_file = genai.get_file(video_file.name)

        if video_file.state.name != "ACTIVE":
            raise Exception(f"Video processing failed: {video_file.state.name}")

        # Generate content
        logging.info("Analyzing video content...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """Analyze this video and identify the most engaging moments.
        For each moment, provide the information in EXACTLY this format:

        MM:SS - MM:SS
        Description: [Describe what happens in this clip]
        Viral Potential: [Rate from 1-10]
        Best Platforms: [List suitable social platforms]

        Keep clips between 1-5 minutes long. 
        Let them make sense in context of the video.
        Focus on moments that would be engaging on social media."""

        response = model.generate_content([video_file, prompt])
        
        # Parse clips from response
        clips = parse_gemini_response(response.text)
        if not clips:
            raise Exception("No valid clips identified")
        
        # Process clips
        processed_clips = []
        for i, clip in enumerate(clips, 1):
            try:
                job.message = f"Processing clip {i}/{len(clips)}..."
                logging.info(job.message)
                
                clip_filename = f"clip_{i}_{clip['start_time']}_{clip['end_time']}.mp4"
                output_path = os.path.join(video_folder, clip_filename)
                
                duration = clip['end_time'] - clip['start_time']
                
                ffmpeg.input(video_path, ss=clip['start_time'], t=duration) \
                      .output(output_path, acodec='copy', vcodec='copy') \
                      .overwrite_output() \
                      .run(capture_stdout=True, capture_stderr=True)
                
                clip['url'] = output_path
                processed_clips.append(clip)
                logging.info(f"Processed clip {i}/{len(clips)}")
                
            except Exception as e:
                logging.error(f"Error processing clip {i}: {e}")
                continue
        
        if not processed_clips:
            raise Exception("Failed to process any clips")
        
        # Create highlights reel
        job.message = "Creating highlights reel..."
        highlights_path = create_highlights_reel(video_folder, processed_clips)
        
        # Update clip URLs
        processed_clips = []
        for clip in clips:
            relative_path = os.path.relpath(clip['url'], 'clips').replace('\\', '/')
            processed_clips.append({
                **clip,
                'url': f"/clips/{relative_path}"
            })

        job.clips = processed_clips

        if highlights_path and os.path.exists(highlights_path):
            relative_highlights = os.path.relpath(highlights_path, 'clips').replace('\\', '/')
            job.highlights = f"/clips/{relative_highlights}"
            logging.info(f"Highlights created at: {job.highlights}")
        else:
            job.highlights = None
            logging.info("No highlights generated")

        job.state = "completed"
        job.message = "Processing completed successfully"
        logging.info("Video processing completed successfully")
        
    except Exception as e:
        job.state = "failed"
        job.error = str(e)
        job.message = f"Processing failed: {str(e)}"
        logging.error(f"Processing error: {e}")
        
    finally:
        try:
            job.message = "Cleaning up files..."
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
        "message": job.message,
        "clips": job.clips if job.state == "completed" else [],
        "highlights": job.highlights if job.state == "completed" else None,
        "error": job.error if job.state == "failed" else None
    }

@app.get("/clips/{file_path:path}")
async def get_video(file_path: str):
    video_path = os.path.join("clips", file_path)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(
        video_path,
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": f"inline; filename={os.path.basename(file_path)}",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)