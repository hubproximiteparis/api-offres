require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-client');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function exporterDonnees() {
    const date = new Date().toISOString().split('T')[0];
    const nomFichier = `backup-hub-${date}.json`;

    console.log(`📦 Extraction des données Supabase...`);
    const { data, error } = await supabase.from('offres_sauvegardees').select('*');

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    fs.writeFileSync(nomFichier, JSON.stringify(data, null, 2));
    console.log(`✅ Fichier ${nomFichier} créé localement.`);
    
    // Ici, nous allons l'envoyer par mail en pièce jointe (Solution la plus simple sans API Drive complexe)
    return { nomFichier, data };
}