-- Add DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for onboarding_data table
CREATE POLICY "Users can delete their own onboarding data"
ON public.onboarding_data FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for voice_advisor_sessions table
CREATE POLICY "Users can delete their own voice sessions"
ON public.voice_advisor_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE policy for micro_question_responses table
CREATE POLICY "Users can update their own micro-question responses"
ON public.micro_question_responses FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for micro_question_responses table
CREATE POLICY "Users can delete their own micro-question responses"
ON public.micro_question_responses FOR DELETE
USING (auth.uid() = user_id);