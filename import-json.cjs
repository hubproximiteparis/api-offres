require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runImport() {
    try {
        const rawData = fs.readFileSync('./metiers.json');
        const metiers = JSON.parse(rawData);

        console.log("🧹 Nettoyage de la table...");
        await supabase.from('metiers_rome').delete().neq('id', 0); // Supprime tout

        console.log(`📤 Importation de ${metiers.length} métiers...`);
        const { error } = await supabase.from('metiers_rome').insert(metiers);

        if (error) throw error;
        console.log("✅ Importation réussie !");
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}
runImport();