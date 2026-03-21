import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://zqbplfwzpypzorasgdxf.supabase.co';
const supabaseAnonKey = 'sb_publishable_IPPJbCCv6FjQ4LC0FMFGFw_wVLgIvVC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);