/**
 * HUB PROXIMITÉ - MODULE DE REPORTING ET SAUVEGARDE
 * Centralisation (Supabase), Mobilité, Anonymisation et Export CSV
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. GÉNÉRATION DU CSV DE SAUVEGARDE (TRACABILITÉ) ---
async function genererSauvegardeCSV(statsData) {
    const entetes = "Date;Metier;Zone_Visee;Origine_Utilisateur;IP_Anonyme\n";
    const lignes = statsData.map(s => 
        `${s.created_at};${s.metier};${s.zone_visee};${s.origine_utilisateur};${s.ip_anonymisee}`
    ).join('\n');
    
    const contenu = entetes + lignes;
    const nomFichier = `sauvegarde_logs_${new Date().toISOString().split('T')[0]}.csv`;
    await fs.writeFile(nomFichier, contenu);
    return nomFichier;
}

// --- 2. ANALYSE DE MOBILITÉ (Depuis recherches_stats sur Supabase) ---
async function getSearchStats(dateDebut) {
    const { data, error } = await supabase
        .from('recherches_stats')
        .select('*')
        .gte('created_at', dateDebut);

    if (error || !data || data.length === 0) return { html: "", rawData: [] };

    const stats = {};
    data.forEach(row => {
        if (!stats[row.metier]) stats[row.metier] = [];
        stats[row.metier].push({ zone: row.zone_visee, origine: row.origine_utilisateur });
    });

    let html = `<h3 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; margin-top: 25px; font-size: 15px;">🔍 ANALYSE DE MOBILITÉ</h3>`;

    Object.keys(stats).sort().forEach(m => {
        html += `<div style="margin-bottom: 10px; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 5px;">
                    <strong style="color: #2d3748;">💼 ${m}</strong> (${stats[m].length} recherches)
                    <ul style="font-size: 11px; color: #4a5568; margin: 5px 0;">`;
        stats[m].forEach(s => {
            html += `<li>Visé: <b>${s.zone}</b> <span style="color:#718096;">←</span> Origine: <b>${s.origine}</b></li>`;
        });
        html += `</ul></div>`;
    });

    return { html, rawData: data };
}

// --- 3. OFFRES SAUVEGARDÉES (Triées et Anonymisées) ---
async function getSavedJobs(dateDebut) {
    try {
        const { data: offres, error } = await supabase
            .from('offres_sauvegardees')
            .select('user_id, intitule, lieu, entreprise')
            .gte('created_at', dateDebut);

        if (error || !offres || offres.length === 0) {
            return "<p style='color: #94a3b8; font-size: 12px; font-style: italic; margin-top:20px;'>Aucune offre sauvegardée aujourd'hui.</p>";
        }

        const structure = {};
        offres.forEach(o => {
            const metier = (o.intitule || "Non précisé").toUpperCase().trim();
            const ville = (o.lieu || "Secteur non défini").trim();
            const anonId = o.user_id ? o.user_id.substring(0, 4).toUpperCase() : "EXT";
            
            if (!structure[metier]) structure[metier] = {};
            if (!structure[metier][ville]) structure[metier][ville] = [];
            structure[metier][ville].push({ user: `Profil_${anonId}`, boite: o.entreprise || "Confidentiel" });
        });

        let html = `<h3 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 8px; font-size: 15px; margin-top:30px;">📋 RÉCAPITULATIF DES SAUVEGARDES</h3>`;

        Object.keys(structure).sort().forEach(metier => {
            html += `<div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: white;">
                        <div style="background: #1a365d; color: white; padding: 8px 12px; font-size: 12px; font-weight: bold;">💼 ${metier}</div>`;
            
            Object.keys(structure[metier]).sort().forEach(ville => {
                html += `<div style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
                            <p style="margin: 0; color: #d9534f; font-weight: bold; font-size: 11px; text-transform: uppercase;">📍 ${ville}</p>
                            <ul style="margin: 5px 0; padding-left: 15px; font-size: 12px; color: #4a5568; list-style: none;">
                                ${structure[metier][ville].map(item => `<li>• <span style="font-weight: 600;">${item.user}</span> a retenu : <i>${item.boite}</i></li>`).join('')}
                            </ul>
                         </div>`;
            });
            html += `</div>`;
        });
        return html;
    } catch (err) { return "Erreur lors de la récupération des offres."; }
}

// --- 4. FONCTION PRINCIPALE ---
async function generate() {
    const dateMinuit = new Date();
    dateMinuit.setHours(0,0,0,0);
    const dateStr = dateMinuit.toISOString();

    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: { 
                user: process.env.REPORT_EMAIL, 
                pass: process.env.REPORT_PASSWORD 
            }
        });

        // Exécution parallèle des récupérations
        const [ { html: blocMobilite, rawData: statsData }, blocOffres ] = await Promise.all([
            getSearchStats(dateStr),
            getSavedJobs(dateStr)
        ]);
        
        // Gestion de la pièce jointe CSV
        let piecesJointes = [];
        if (statsData.length > 0) {
            const pathCSV = await genererSauvegardeCSV(statsData);
            piecesJointes.push({ filename: pathCSV, path: pathCSV });
        }

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #fdfcfb; color: #1a365d;">
                <div style="text-align:center; padding-bottom: 20px; border-bottom: 4px solid #1a365d;">
                    <h1 style="margin:0; font-size: 22px;">HUB PROXIMITÉ - DASHBOARD</h1>
                    <p style="margin:5px 0 0 0; color:#a0aec0; font-size: 13px;">Rapport du ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                
                ${blocMobilite || "<p style='margin-top:20px;'>Aucune recherche enregistrée aujourd'hui.</p>"}
                ${blocOffres}
                
                <div style="margin-top: 40px; padding: 15px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 10px; color: #64748b;">
                    Sauvegarde CSV jointe à cet email. Données stockées de façon persistante sur Supabase.<br>
                    Tri et anonymisation conformes aux instructions.
                </div>
            </div>`;

        await transporter.sendMail({
            from: `"Hub Proximité" <${process.env.REPORT_EMAIL}>`,
            to: process.env.VOTRE_EMAIL_RECEPTION || process.env.REPORT_EMAIL,
            subject: `📊 Rapport & Sauvegarde Hub - ${new Date().toLocaleDateString('fr-FR')}`,
            html: emailHtml,
            attachments: piecesJointes
        });

        // Nettoyage du fichier temporaire
        if (piecesJointes.length > 0) await fs.unlink(piecesJointes[0].path);

        return true;
    } catch (error) {
        console.error("❌ Erreur Reporting:", error);
        throw error;
    }
}

module.exports = { generate };