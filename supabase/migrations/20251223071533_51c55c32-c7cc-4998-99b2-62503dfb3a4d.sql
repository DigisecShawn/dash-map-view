-- Add icon_type column to cameras table for different camera icon styles
ALTER TABLE public.cameras 
ADD COLUMN icon_type text NOT NULL DEFAULT 'camera';

-- Add comment for documentation
COMMENT ON COLUMN public.cameras.icon_type IS 'Camera icon style: camera, video, cctv, webcam, dome';