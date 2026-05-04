ALTER TABLE public.estimate_other
ADD COLUMN IF NOT EXISTS note_included boolean;

UPDATE public.estimate_other
SET note_included = false
WHERE note_included IS NULL;

ALTER TABLE public.estimate_other
ALTER COLUMN note_included SET DEFAULT false;

ALTER TABLE public.estimate_other
ALTER COLUMN note_included SET NOT NULL;

COMMENT ON COLUMN public.estimate_other.note_included
IS 'When true, this other-item row is auto-added to section Includes notes.';
