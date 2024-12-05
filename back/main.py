
# ** works great dont change it**

from datetime import datetime
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
# Add these imports at the top
import stripe
from fastapi import Request
# Add to your main.py imports
from supabase import create_client, Client
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--fc837ba8.local-credentialless.webcontainer-api.io","https://clipsgenerator.vercel.app", "https://sb1tjeckc-sayr--5173--fc837ba8.local-corp.webcontainer.io", "https://boisterous-treacle-a2525d.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Stripe with your secret key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
# Add these environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
# Initialize Supabase client


if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# # Initialize Stripe
# stripe.api_key = STRIPE_SECRET_KEY



# Configure Gemini AI
genai.configure(api_key=os.getenv("GOOGLE_AI_API_KEY"))

# Mount the clips directory to serve files
app.mount("/clips", StaticFiles(directory="clips"), name="clips")

# Add these new models
class CheckoutSession(BaseModel):
    price_id: str
    user_id: str

class StripeWebhookEvent(BaseModel):
    type: str
    data: Dict

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

        # Before marking job as completed
        if 'user_id' in options:
            logging.info(f"Processing completed, saving history for user {options['user_id']}")
            try:
                await save_video_history(
                    user_id=options['user_id'],
                    clips=processed_clips,
                    highlights_url=job.highlights,
                    video_url=url
                )
                logging.info("Successfully saved video history")
            except Exception as e:
                logging.error(f"Failed to save video history: {str(e)}")
                # Continue processing even if history save fails
        else:
            logging.warning("No user_id provided in options, skipping history save")

        job.state = "completed"
        job.clips = processed_clips
        job.highlights = highlights_path
        job.message = "Processing completed successfully"
        
    except Exception as e:
        logging.error(f"Processing error: {str(e)}")
        job.state = "failed"
        job.error = str(e)

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


@app.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutSession):
    try:
        # Get user data from Supabase
        user_response = supabase.table('users') \
            .select('email, stripe_customer_id') \
            .eq('user_id', request.user_id) \
            .single() \
            .execute()
            
        if hasattr(user_response, 'error') and user_response.error:
            raise HTTPException(status_code=400, detail=str(user_response.error))
            
        user_data = user_response.data
        customer_id = user_data.get('stripe_customer_id')

        # Create or get Stripe customer
        if not customer_id:
            customer = stripe.Customer.create(
                email=user_data['email'],
                metadata={
                    'supabase_user_id': request.user_id
                }
            )
            customer_id = customer.id
            
            # Update user with Stripe customer ID
            supabase.table('users') \
                .update({'stripe_customer_id': customer_id}) \
                .eq('user_id', request.user_id) \
                .execute()

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': request.price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{CLIENT_URL}/subscription?success=true",
            cancel_url=f"{CLIENT_URL}/subscription?canceled=true",
            metadata={
                'user_id': request.user_id
            }
        )

        return {"sessionId": session.id}

    except Exception as e:
        logging.error(f"Checkout session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook")
async def stripe_webhook(request: Request):
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        logging.info("Received webhook event")
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        
        logging.info(f"Webhook event type: {event['type']}")
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            subscription_id = session.get('subscription')
            
            # Retrieve the subscription to get the price ID
            subscription = stripe.Subscription.retrieve(subscription_id)
            price_id = subscription.plan.id
            logging.info(f"Received price ID: {price_id}")
            
            # Map price ID to subscription tier
            if price_id == 'price_1QPI1eHJURPFbP5mk9y6XFZX':
                subscription_tier = 'regular'
                logging.info("Setting tier to regular")
            elif price_id == 'price_1QPI5QHJURPFbP5mzpIrOW6M':
                subscription_tier = 'pro'
                logging.info("Setting tier to pro")
            else:
                subscription_tier = 'free'
                logging.info(f"Unknown price ID {price_id}, setting tier to free")
            
            # Get the user_id from metadata
            user_id = session.metadata.get('user_id')
            logging.info(f"Updating user {user_id} to tier {subscription_tier}")
            
            # Update subscription details
            update_response = supabase.table('users').update({
                'subscription_status': 'active',
                'subscription_tier': subscription_tier,
                'stripe_subscription_id': subscription_id,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', user_id).execute()
            
            logging.info(f"Updated subscription after checkout: {update_response.data}")
            
        elif event['type'] in ['customer.subscription.updated', 'customer.subscription.created']:
            subscription = event['data']['object']
            price_id = subscription.plan.id
            logging.info(f"Subscription update/create with price ID: {price_id}")
            
            # Map price ID to subscription tier
            if price_id == 'price_1QPI1eHJURPFbP5mk9y6XFZX':
                subscription_tier = 'regular'
                logging.info("Setting tier to regular")
            elif price_id == 'price_1QPI5QHJURPFbP5mzpIrOW6M':
                subscription_tier = 'pro'
                logging.info("Setting tier to pro")
            else:
                subscription_tier = 'free'
                logging.info(f"Unknown price ID {price_id}, setting tier to free")
            
            # Update both status and tier
            update_response = supabase.table('users').update({
                'subscription_status': subscription.status,
                'subscription_tier': subscription_tier,
                'updated_at': datetime.now().isoformat()
            }).eq('stripe_customer_id', subscription.customer).execute()
            
            logging.info(f"Updated subscription data: {update_response.data}")
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            
            update_response = supabase.table('users').update({
                'subscription_status': 'inactive',
                'subscription_tier': 'free',
                'updated_at': datetime.now().isoformat()
            }).eq('stripe_customer_id', subscription.customer).execute()
            
            logging.info(f"Subscription cancelled, reset to free tier: {update_response.data}")

        return {"status": "success"}

    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Add this new endpoint to your existing FastAPI app
@app.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    try:
        # Get user from auth header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = auth_header.split(' ')[1]
        try:
            user_response = supabase.auth.get_user(token)
            user_id = user_response.user.id
        except Exception as e:
            logging.error(f"Auth error: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid authentication token")

        # Get user's stripe customer ID
        try:
            user_data = supabase.table('users').select('stripe_customer_id').eq('user_id', user_id).execute()
            
            if not user_data.data:
                raise HTTPException(status_code=404, detail="User not found")
                
            stripe_customer_id = user_data.data[0].get('stripe_customer_id')
            
            if not stripe_customer_id:
                raise HTTPException(status_code=404, detail="No Stripe customer ID found")
        except Exception as e:
            logging.error(f"Database error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to fetch user data")

        # Get customer's active subscriptions
        try:
            subscriptions = stripe.Subscription.list(
                customer=stripe_customer_id,
                limit=1,
                status='active'
            )

            if not subscriptions.data:
                raise HTTPException(status_code=404, detail="No active subscription found")

            # Cancel the subscription at period end instead of immediate deletion
            subscription = stripe.Subscription.modify(
                subscriptions.data[0].id,
                cancel_at_period_end=True
            )

            # Update user's subscription status in Supabase
            update_response = supabase.table('users').update({
                'subscription_status': 'cancelling',  # or keep as 'active' until period end
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', user_id).execute()

            if hasattr(update_response, 'error') and update_response.error:
                raise Exception(update_response.error)

        except stripe.error.StripeError as e:
            logging.error(f"Stripe error: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logging.error(f"Cancellation error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to cancel subscription")

        return {"message": "Subscription cancelled successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

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
# After successful video processing
async def save_video_history(user_id: str, clips: list, highlights_url: str, video_url: str):
    try:
        logging.info(f"Attempting to save video history for user {user_id}")
        logging.info(f"Clips: {clips}")
        logging.info(f"Highlights URL: {highlights_url}")
        
        # Get current subscription tier
        user_data = supabase.table('users').select('subscription_tier').eq('user_id', user_id).single().execute()
        logging.info(f"User data response: {user_data}")
        
        subscription_tier = user_data.data.get('subscription_tier', 'free')
        logging.info(f"User subscription tier: {subscription_tier}")

        # Save to history
        history_data = {
            'user_id': user_id,
            'clips': clips,
            'highlights_url': highlights_url,
            'subscription_tier': subscription_tier,
            'video_url': video_url,
            'video_title': 'Video Title'
        }
        logging.info(f"Attempting to insert history data: {history_data}")
        
        response = supabase.table('video_history').insert(history_data).execute()
        logging.info(f"Insert response: {response}")
        
        return response.data
    except Exception as e:
        logging.error(f"Error saving video history: {str(e)}")
        logging.error(f"Error type: {type(e)}")
        raise e
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)






