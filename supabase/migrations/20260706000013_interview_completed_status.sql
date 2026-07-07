-- Insert an "Interview Completed" step between "Meeting Scheduled" and "CHASS1S Shared".

ALTER TYPE accreditation_status ADD VALUE IF NOT EXISTS 'interview_completed' BEFORE 'chass1s_shared';
