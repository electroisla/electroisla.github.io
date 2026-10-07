// ElectroIsla — configuración pública de Supabase.
// Esta clave es la publishable key y puede estar en el frontend.
// NO pongas aquí una sb_secret_ ni service_role key.
const SUPABASE_URL = "https://pdvfupvtofpzfllkjhhc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5AaqssiZuAx_ogZrV0tEAA_gXU-QYg-";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
