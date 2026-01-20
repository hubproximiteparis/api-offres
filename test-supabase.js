require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSupabase() {
    console.log("🔗 Vérification Supabase...");
    const { data, error } = await supabase.from('statistiques_outils').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("❌ Erreur Supabase :", error.message);
        console.log("Vérifiez l'URL :", process.env.SUPABASE_URL);
    } else {
        console.log("✅ Connexion Supabase réussie !");
    }
}
checkSupabase();