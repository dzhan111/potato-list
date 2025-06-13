-- Enable Row Level Security

-- Create profiles table to store additional user information
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bucket_list_items table
CREATE TABLE bucket_list_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    is_public BOOLEAN DEFAULT true NOT NULL
);

-- Create completions table
CREATE TABLE completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_list_item_id UUID REFERENCES bucket_list_items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    photo_url TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(bucket_list_item_id, user_id)
);

-- Drop existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'completions_user_id_fkey'
    ) THEN
        ALTER TABLE completions DROP CONSTRAINT completions_user_id_fkey;
    END IF;
END $$;

-- Add foreign key relationship between completions and profiles
ALTER TABLE completions
ADD CONSTRAINT completions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up Row Level Security (RLS) policies

-- Bucket list items policies
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bucket list items are viewable by everyone"
    ON bucket_list_items FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can view their own private bucket list items"
    ON bucket_list_items FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can create bucket list items"
    ON bucket_list_items FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own bucket list items"
    ON bucket_list_items FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own bucket list items"
    ON bucket_list_items FOR DELETE
    USING (auth.uid() = created_by);

-- Completions policies
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completions are viewable by everyone"
    ON completions FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own completions"
    ON completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
    ON completions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
    ON completions FOR DELETE
    USING (auth.uid() = user_id);

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create indexes for better query performance
CREATE INDEX bucket_list_items_created_by_idx ON bucket_list_items(created_by);
CREATE INDEX completions_bucket_list_item_id_idx ON completions(bucket_list_item_id);
CREATE INDEX completions_user_id_idx ON completions(user_id);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Set up storage policies
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ); 