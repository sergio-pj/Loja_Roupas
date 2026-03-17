import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zqbplfwzpypzorasgdxf.supabase.com'
const supabaseAnonKey = 'sb_publishable_IPPJbCCv6FjQ4LC0FMFGFw_wVLgIvVC'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const fetchDestaques = async () => {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('destaque', true)
    .limit(3)

  if (error) console.log('Erro:', error)
  else return data
}