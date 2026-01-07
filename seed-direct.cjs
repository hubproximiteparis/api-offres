require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const topMetiers = [
    { code_rome: 'M1805', libelle: 'Développeur / Développeuse informatique', libelle_ascii: 'developpeur informatique' },
    { code_rome: 'D1102', libelle: 'Boulanger / Boulangère', libelle_ascii: 'boulanger boulangere' },
    { code_rome: 'D1101', libelle: 'Boucher / Bouchère', libelle_ascii: 'boucher bouchere' },
    { code_rome: 'J1301', libelle: 'Infirmier / Infirmière', libelle_ascii: 'infirmier infirmiere' },
    { code_rome: 'F1604', libelle: 'Plombier / Plombière', libelle_ascii: 'plombier plombiere' }
    // Vous pourrez en ajouter d'autres ici
];

async function seed() {
    console.log("🚀 Injection des métiers prioritaires...");
    const { error } = await supabase.from('metiers_rome').upsert(topMetiers);
    if (error) console.error(error);
    else console.log("✅ Base prête pour les tests !");
}
seed();