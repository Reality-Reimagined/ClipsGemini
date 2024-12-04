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

# start command = uvicorn main:app --reload --port 5050
#

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--fc837ba8.local-credentialless.webcontainer-api.io/"],
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

def create_gemini_prompt(video_file, transcript):
    return f"""Analyze this video content and identify the most engaging, valuable, or viral-worthy moments. 
    For each identified clip:
    1. Provide precise timestamps (start and end)
    2. Explain why this segment is significant
    3. Rate its viral potential on a scale of 1-10
    4. Suggest optimal social media platforms for sharing

    Consider:
    - Key discussion points or revelations
    - Emotional moments or reactions
    - Surprising or unexpected content
    - Educational or informative segments
    - Humorous or entertaining parts

    Format each clip as:
    START_TIME - END_TIME
    Description: [Why this clip is significant]
    Viral Potential: [1-10]
    Best Platforms: [Platform list]
    
    Video Transcript: {transcript}
    """

def process_video_task(job_id: str, url: str, options: dict):
    job = active_jobs[job_id]
    try:
        # Download video
        with YoutubeDL() as ydl:
            info = ydl.extract_info(url, download=True)
            video_path = ydl.prepare_filename(info)
            transcript = info.get('subtitles', {}).get('en', '')

        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Analyze content
        prompt = create_gemini_prompt(video_path, transcript)
        response = model.generate_content(prompt)
        
        # Parse response and extract clips
        clips = parse_gemini_response(response.text)
        
        # Process clips with FFmpeg
        for clip in clips:
            start_time = clip['start_time']
            end_time = clip['end_time']
            
            output_path = f"clips/{job_id}_{start_time}_{end_time}.mp4"
            
            ffmpeg.input(video_path, ss=start_time, t=end_time-start_time) \
                  .output(output_path, acodec='copy', vcodec='copy') \
                  .run(capture_stdout=True, capture_stderr=True)
            
            clip['url'] = output_path

        job.clips = clips
        job.state = "completed"
        
    except Exception as e:
        job.state = "failed"
        job.error = str(e)

@app.post("/process-video")
async def process_video(request: VideoRequest, background_tasks: BackgroundTasks):
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
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "state": job.state,
        "clips": job.clips if job.state == "completed" else [],
        "error": job.error if job.state == "failed" else None
    }
from utils.gemini_parser import parse_gemini_response
def parse_gemini_response(response_text: str) -> list:
    # Implementation to parse Gemini's response and extract clip information
    clips = []
    # Parse the response text and extract timestamps and descriptions
    # Add logic to convert the response into structured clip data
    return clips

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)

# # Update the parse_gemini_response import
# from utils.gemini_parser import parse_gemini_response

# # # Update the system instructions for Gemini
# # def create_gemini_prompt(video_file, transcript):
# #     system_instructions = """
# #     You are a professional video content analyzer. Your task is to:
# #     1. Identify the most engaging moments in videos
# #     2. Provide precise timestamps for each clip
#     3. Explain why each segment is significant
#     4. Rate viral potential
#     5. Suggest optimal sharing platforms
    
#     Format your response exactly as follows for each clip:
    
#     MM:SS - MM:SS
#     Description: [Clear explanation of significance]
#     Viral Potential: [1-10]
#     Best Platforms: [Comma-separated list]
    
#     Ensure all timestamps are in MM:SS or HH:MM:SS format.
#     Focus on moments that are:
#     - Emotionally impactful
#     - Surprising or unexpected
#     - Highly informative
#     - Humorous or entertaining
#     - Visually striking
#     """
    
#     return f"{system_instructions}\n\nAnalyze the following video content:\n{transcript}"

# # Update the process_video_task function to include error handling
# def process_video_task(job_id: str, url: str, options: dict):
#     job = active_jobs[job_id]
#     try:
#         # Enhanced error handling for video download
#         try:
#             with YoutubeDL() as ydl:
#                 info = ydl.extract_info(url, download=True)
#                 video_path = ydl.prepare_filename(info)
#                 transcript = info.get('subtitles', {}).get('en', '')
                
#                 if not transcript:
#                     # Attempt to get auto-generated captions if available
#                     transcript = info.get('automatic_captions', {}).get('en', '')
#         except Exception as e:
#             raise Exception(f"Failed to download video: {str(e)}")

#         # Initialize Gemini model with error handling
#         try:
#             model = genai.GenerativeModel('gemini-1.5-pro')
#             prompt = create_gemini_prompt(video_path, transcript)
#             response = model.generate_content(prompt)
#         except Exception as e:
#             raise Exception(f"Failed to analyze content: {str(e)}")

#         # Parse response and extract clips
#         clips = parse_gemini_response(response.text)
        
#         if not clips:
#             raise Exception("No valid clips were identified in the video")

#         # Process clips with FFmpeg
#         processed_clips = []
#         for clip in clips:
#             try:
#                 output_path = f"clips/{job_id}_{clip['start_time']}_{clip['end_time']}.mp4"
                
#                 ffmpeg.input(video_path, ss=clip['start_time'], t=clip['end_time']-clip['start_time']) \
#                       .output(output_path, acodec='copy', vcodec='copy') \
#                       .run(capture_stdout=True, capture_stderr=True)
                
#                 clip['url'] = output_path
#                 processed_clips.append(clip)
#             except Exception as e:
#                 print(f"Failed to process clip: {str(e)}")
#                 continue

#         if not processed_clips:
#             raise Exception("Failed to process any clips")

#         job.clips = processed_clips
#         job.state = "completed"
        
#     except Exception as e:
#         job.state = "failed"
#         job.error = str(e)