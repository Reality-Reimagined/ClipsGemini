-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active'
);

-- Clips Storage
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    original_video_url TEXT NOT NULL,
    start_time INTERVAL NOT NULL,
    end_time INTERVAL NOT NULL,
    description TEXT,
    viral_score INTEGER CHECK (viral_score BETWEEN 1 AND 10),
    platforms TEXT[],
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Usage Tracking
CREATE TABLE monthly_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    month DATE NOT NULL,
    clip_count INTEGER DEFAULT 0,
    UNIQUE(user_id, month)
);

-- Create indexes
CREATE INDEX idx_clips_user_id ON clips(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_monthly_usage_user_month ON monthly_usage(user_id, month);

-- Storage bucket policy
CREATE POLICY "Authenticated users can upload clips"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'clips_storage_bucket');

CREATE POLICY "Users can view their own clips"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'clips_storage_bucket' AND auth.uid()::text = (storage.foldername(name))[1]);