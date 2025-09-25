import { createClient } from '@supabase/supabase-js';

// WARNING: These keys are exposed in the client-side code.
// In a production application, you should use environment variables
// and ensure your Row Level Security (RLS) policies are properly configured.
const supabaseUrl = 'https://cncqizmsvxacbsjtjehc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuY3Fpem1zdnhhY2JzanRqZWhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTc5OTUsImV4cCI6MjA2Nzk5Mzk5NX0.1Ms0FdRPVkcqrCBTRjSWWtQvjJbdrXlrAmjc97izEqA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);