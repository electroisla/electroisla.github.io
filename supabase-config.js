// ElectroIsla — configuración pública de Supabase.
// Esta clave es la publishable key y puede estar en el frontend.
// NO pongas aquí una sb_secret_ ni service_role key.
const SUPABASE_URL = "https://dllsojqfpyjyxgwzxpoa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8DbBZxB9EzwyFRZSFy3aHQ_-s1h8Kwr";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
