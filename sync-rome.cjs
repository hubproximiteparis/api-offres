require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function syncRome() {
    try {
        console.log("📥 1. Téléchargement du référentiel ROME 4.0 depuis Data.gouv...");
        // URL stable du fichier CSV des appellations métiers ROME 4.0
        const url = "https://www.data.gouv.fr/fr/datasets/r/a53239a5-1151-4043-9804-0c7b64f9f6e5";
        const response = await axios.get(url);

        console.log("⚙️ 2. Analyse du fichier et préparation des données...");
        const records = parse(response.data, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ';' // Le fichier Data.gouv utilise souvent le point-virgule
        });

        // On formate les données pour votre table Supabase
        const metiers = records.map(r => ({
            code_rome: r.code_rome,
            libelle: r.libelle_appellation,
            libelle_ascii: r.libelle_appellation
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
        }));

        console.log(`📤 3. Envoi de ${metiers.length} métiers vers Supabase (par paquets)...`);
        
        // Insertion par lots de 500 pour éviter de saturer la base
        for (let i = 0; i < metiers.length; i += 500) {
            const batch = metiers.slice(i, i + 500);
            const { error } = await supabase
                .from('metiers_rome')
                .upsert(batch, { onConflict: 'libelle' });

            if (error) throw error;
            console.log(`✅ Progress: ${i + batch.length} / ${metiers.length}`);
        }

        console.log("✨ Terminé ! Votre base locale est à jour.");
    } catch (err) {
        console.error("❌ Erreur lors de la synchronisation :", err.message);
    }
}

syncRome();