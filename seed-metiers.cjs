require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const metiersTest = [
    { code_rome: 'D1102', libelle: 'Boulangerie / Pâtisserie', libelle_ascii: 'boulangerie patisserie', definition: 'Confectionne et vend des produits de boulangerie.' },
    { code_rome: 'D1101', libelle: 'Boucher / Bouchère', libelle_ascii: 'boucher bouchere', definition: 'Découpe et prépare les viandes.' },
    { code_rome: 'D1214', libelle: 'Vendeur / Vendeuse en prêt-à-porter', libelle_ascii: 'vendeur vendeuse en pret-a-porter', definition: 'Conseille les clients en magasin de vêtements.' },
    { code_rome: 'H1502', libelle: 'Conducteur / Conductrice de ligne de production', libelle_ascii: 'conducteur conductrice de ligne de production', definition: 'Surveille et pilote une ligne automatisée.' },
    { code_rome: 'M1805', libelle: 'Développeur / Développeuse informatique', libelle_ascii: 'developpeur developpeuse informatique', definition: 'Conçoit et écrit des programmes informatiques.' }
];

async function seed() {
    console.log("🚀 Insertion des métiers de test...");
    const { error } = await supabase.from('metiers_rome').upsert(metiersTest, { onConflict: 'code_rome' });

    if (error) {
        console.error("❌ Erreur d'insertion :", error.message);
    } else {
        console.log("✅ Métiers de test insérés avec succès ! Vous pouvez tester votre recherche web.");
    }
}

seed();