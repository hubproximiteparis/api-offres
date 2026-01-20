/**
 * HUB PROXIMITÉ - MODULE DE REPORTING QUOTIDIEN (v3.1)
 * Optimisé pour la gestion des erreurs et le tri alphabétique.
 */
require('dotenv').config(); 
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- FONCTION : LECTURE DES LOGS DE RECHERCHE LOCAUX ---
async function genererRecapRecherchesLocales() {
    try {
        // Vérifier si le fichier existe avant de lire
        await fs.access('searches_log.txt');
        const data = await fs.readFile('searches_log.txt', 'utf8');
        
        if (!data || data.trim() === "") return "<p style='color: #9ca3af; font-size: 12px;'>Aucune recherche effectuée aujourd'hui.</p>";

        const lignes = data.trim().split('\n');
        let html = `
            <h3 style="color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-top: 25px; font-size: 16px;">
                🔍 RECHERCHES EFFECTUÉES (FLUX RÉEL)
            </h3>
            <div style="background: white; border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #4b5563;">`;
        
        lignes.forEach(ligne => {
            html += `<div style="border-bottom: 1px solid #f3f4f6; padding: 4px 0;">${ligne}</div>`;
        });

        html += `</div>`;
        
        // Vider le fichier pour le lendemain
        await fs.writeFile('searches_log.txt', ''); 
        return html;
    } catch (err) {
        // Si le fichier n'existe pas, on ne bloque pas le rapport
        return "<p style='color: #9ca3af; font-size: 12px;'>Aucun journal de recherche disponible.</p>";
    }
}

// --- FONCTION : STATS OUTILS ---
async function genererStatsOutils(dateDebut) {
    try {
        const { data, error } = await supabase
            .from('statistiques_outils')
            .select('nom_outil')
            .gte('created_at', dateDebut);

        if (error || !data || data.length === 0) return "";

        const recap = data.reduce((acc, curr) => {
            const nom = curr.nom_outil || "Outil Inconnu";
            acc[nom] = (acc[nom] || 0) + 1;
            return acc;
        }, {});

        let html = `
            <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-top: 35px; font-size: 16px; font-weight: 800;">
                🛠️ UTILISATION DES OUTILS
            </h3>
            <table style="width: 100%; border-collapse: collapse; background: white; font-size: 13px; border: 1px solid #e5e7eb;">
                <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left;">Outil</th>
                    <th style="padding: 12px; text-align: center;">Ouvertures</th>
                </tr>`;

        for (const [outil, count] of Object.entries(recap)) {
            html += `<tr><td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${outil}</td>
                         <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center;"><strong>${count}</strong></td></tr>`;
        }
        return html + `</table>`;
    } catch (err) { return ""; }
}

// --- FONCTION : OFFRES SAUVEGARDÉES ---
async function genererTableauOffres(dateDebut) {
    try {
        const { data: offres, error } = await supabase
            .from('offres_sauvegardees')
            .select('user_id, intitule, lieu, entreprise')
            .gte('created_at', dateDebut);

        if (error || !offres || offres.length === 0) {
            return "<h3 style='color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; font-size: 16px; font-weight: 800;'>📋 OFFRES ENREGISTRÉES</h3><p style='color: #6b7280; font-size: 12px;'>Aucun favori enregistré ces dernières 24h.</p>";
        }

        const structure = {};
        offres.forEach(o => {
            const metier = (o.intitule || "Non précisé").toUpperCase().trim();
            const ville = (o.lieu || "Secteur non défini").trim();
            // Anonymisation demandée : Profil_XXXX
            const anonId = o.user_id ? o.user_id.substring(0, 4).toUpperCase() : "EXT";
            
            if (!structure[metier]) structure[metier] = {};
            if (!structure[metier][ville]) structure[metier][ville] = [];
            structure[metier][ville].push({ user: `Profil_${anonId}`, boite: o.entreprise || "Confidentiel" });
        });

        let html = `<h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; font-size: 16px; font-weight: 800; margin-top:30px;">📋 OFFRES ENREGISTRÉES</h3>`;

        // Tri alphabétique des métiers
        Object.keys(structure).sort().forEach(metier => {
            html += `<div style="margin-bottom: 15px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff;">
                        <div style="background: #1e293b; color: white; padding: 8px 12px; font-size: 12px; font-weight: bold;">💼 ${metier}</div>`;
            
            // Tri alphabétique des villes
            Object.keys(structure[metier]).sort().forEach(ville => {
                html += `<div style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
                            <p style="margin: 0; color: #3b82f6; font-weight: bold; font-size: 11px; text-transform: uppercase;">📍 ${ville}</p>
                            <ul style="margin: 5px 0; padding-left: 15px; font-size: 12px; color: #475569; list-style: none;">
                                ${structure[metier][ville].map(item => `<li><span style="color:#0f172a; font-weight: 600;">${item.user}</span> a sauvegardé <i>${item.boite}</i></li>`).join('')}
                            </ul>
                         </div>`;
            });
            html += `</div>`;
        });
        return html;
    } catch (err) { return ""; }
}

// --- FONCTION PRINCIPALE ---
async function envoyerRapportQuotidien() {
    const userEmail = process.env.REPORT_EMAIL;
    const userPass = process.env.REPORT_PASSWORD;
    const receptionEmail = process.env.VOTRE_EMAIL_RECEPTION || userEmail;

    if (!userEmail || !userPass) {
        console.error("❌ Identifiants Mail manquants dans .env (REPORT_EMAIL / REPORT_PASSWORD)");
        return;
    }

    // Calcul de la date : Minuit ce matin pour avoir la journée en cours
    const dateDebut = new Date();
    dateDebut.setHours(0,0,0,0);
    const dateStr = dateDebut.toISOString();

    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { user: userEmail, pass: userPass }
        });

        // Collecte parallèle
        const [blocOffres, blocOutils, blocRecherches] = await Promise.all([
            genererTableauOffres(dateStr),
            genererStatsOutils(dateStr),
            genererRecapRecherchesLocales()
        ]);

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f8fafc; color: #1e293b;">
                <div style="text-align:center; padding-bottom: 20px;">
                    <h1 style="margin:0; font-size: 24px; color: #0f172a;">📊 Rapport Hub Proximité</h1>
                    <p style="margin:5px 0 0 0; color:#64748b; font-size: 14px;">Activité du ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                
                ${blocRecherches}
                ${blocOffres}
                ${blocOutils}
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
                    <strong>HUB PROXIMITÉ</strong><br>
                    Génération automatique quotidienne à 18h00.<br>
                    Système de centralisation anonymisé conforme à vos préférences.
                </div>
            </div>`;

        await transporter.sendMail({
            from: `"Hub Proximité" <${userEmail}>`,
            to: receptionEmail,
            subject: `📊 Rapport d'Activité Hub - ${new Date().toLocaleDateString('fr-FR')}`,
            html: emailHtml
        });
        
        console.log("✅ Rapport quotidien envoyé avec succès à " + receptionEmail);
    } catch (error) { 
        console.error("❌ Échec envoi rapport:", error.message); 
    }
}

if (require.main === module) {
    envoyerRapportQuotidien();
}

module.exports = { envoyerRapportQuotidien };