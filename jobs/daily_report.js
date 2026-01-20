/**
 * HUB PROXIMITÉ - RAPPORT ANALYTIQUE CONSOLIDÉ
 * Analyse des Offres Sauvegardées + Tension du Marché + Graphiques
 */

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. FONCTION UTILITAIRE : GÉNÉRATION DE GRAPHIQUES ---
const generateChartUrl = (labels, data, title = '') => {
    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre d\'offres',
                data: data,
                backgroundColor: '#2b6cb0',
                borderRadius: 5
            }]
        },
        options: {
            title: { display: true, text: title },
            legend: { display: false }
        }
    };
    
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};

// --- 2. FONCTION PRINCIPALE ---
async function sendDailySummary() {
    const now = new Date();
    // Début de journée pour les statistiques (00:00:00)
    const startOfToday = new Date(now.setHours(0,0,0,0)).toISOString();
    const dateLabel = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    console.log(`📊 [${new Date().toISOString()}] Génération du rapport consolidé...`);

    try {
        // --- RÉCUPÉRATION DES DONNÉES ---
        const [resFavoris, resAnalytics] = await Promise.all([
            supabase.from('offres_sauvegardees').select('*'),
            supabase.from('analytics_events').select('*').gte('created_at', startOfToday)
        ]);

        if (resFavoris.error) throw resFavoris.error;
        if (resAnalytics.error) throw resAnalytics.error;

        const favoris = resFavoris.data || [];
        const logs = resAnalytics.data || [];

        // --- ANALYSE DES OFFRES (Pour le Graphique) ---
        const statsOffres = {};
        favoris.forEach(f => {
            let job = (f.intitule || "Poste non précisé").trim();
            job = job.charAt(0).toUpperCase() + job.slice(1).toLowerCase();
            statsOffres[job] = (statsOffres[job] || 0) + 1;
        });

        // --- ANALYSE DE LA TENSION (Pour le Tableau) ---
        const tensionMap = {};
        logs.forEach(log => {
            if (log.tension_score) {
                const key = (log.metier || 'Inconnu').toUpperCase();
                if (!tensionMap[key]) tensionMap[key] = [];
                tensionMap[key].push(log.tension_score);
            }
        });

        // --- PRÉPARATION DU GRAPHIQUE ---
        const jobLabels = Object.keys(statsOffres).slice(0, 5);
        const jobCounts = jobLabels.map(j => statsOffres[j]);
        
        const chartUrl = jobLabels.length > 0 
            ? generateChartUrl(jobLabels, jobCounts, 'Top Métiers Sauvegardés')
            : 'https://quickchart.io/chart?c=%7B%22type%22%3A%22bar%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Aucun%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Offres%22%2C%22data%22%3A%5B0%5D%7D%5D%7D%7D';

        // --- CONSTRUCTION DU HTML ---
        let htmlContent = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 20px;">
            <div style="max-width: 650px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div style="background: #1a365d; color: white; padding: 25px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; letter-spacing: 1px;">HUB ANALYTICS</h1>
                    <p style="margin: 5px 0 0 0; opacity: 0.8;">Rapport d'activité du ${dateLabel}</p>
                </div>

                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-around; margin-bottom: 25px;">
                        <div style="text-align: center; background: #f0f9ff; padding: 15px; border-radius: 8px; width: 45%;">
                            <span style="display: block; color: #2b6cb0; font-weight: bold; font-size: 20px;">${favoris.length}</span>
                            <span style="font-size: 11px; color: #4a5568; text-transform: uppercase;">Favoris Totaux</span>
                        </div>
                        <div style="text-align: center; background: #fff5f5; padding: 15px; border-radius: 8px; width: 45%;">
                            <span style="display: block; color: #c53030; font-weight: bold; font-size: 20px;">${Object.keys(tensionMap).length}</span>
                            <span style="font-size: 11px; color: #4a5568; text-transform: uppercase;">Analyses Tension</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="${chartUrl}" alt="Graphique d'activité" style="max-width: 100%; height: auto; border: 1px solid #edf2f7; border-radius: 5px;" />
                    </div>

                    <h3 style="color: #2d3748; font-size: 16px; border-left: 4px solid #2b6cb0; padding-left: 10px; margin-bottom: 15px;">Détails des Tensions Marché</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #edf2f7; font-size: 11px; text-align: left; color: #4a5568;">
                            <th style="padding: 10px;">MÉTIER SCANNÉ</th>
                            <th style="padding: 10px;">SCORE</th>
                            <th style="padding: 10px; text-align: right;">STATUT</th>
                        </tr>
                        ${Object.entries(tensionMap).map(([job, scores]) => {
                            const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
                            const color = avg > 70 ? '#e53e3e' : (avg > 40 ? '#dd6b20' : '#38a169');
                            const label = avg > 70 ? 'CRITIQUE' : (avg > 40 ? 'MODÉRÉE' : 'FAIBLE');
                            return `
                            <tr style="border-bottom: 1px solid #f7fafc; font-size: 13px;">
                                <td style="padding: 10px; font-weight: bold;">${job}</td>
                                <td style="padding: 10px;">${avg}%</td>
                                <td style="padding: 10px; text-align: right;">
                                    <span style="color: ${color}; font-weight: bold; font-size: 11px;">● ${label}</span>
                                </td>
                            </tr>`;
                        }).join('') || '<tr><td colspan="3" style="text-align:center; padding: 20px; color: #a0aec0;">Aucune analyse aujourd\'hui</td></tr>'}
                    </table>
                </div>
                
                <div style="background: #f7fafc; padding: 15px; text-align: center; font-size: 10px; color: #a0aec0;">
                    Ce rapport a été généré automatiquement par votre instance Hub Proximité.
                </div>
            </div>
        </div>`;

        // --- ENVOI VIA NODEMAILER ---
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"Hub Analyste" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `📈 Rapport Consolidé : ${dateLabel}`,
            html: htmlContent
        });

        console.log(`✅ Rapport envoyé avec succès.`);
    } catch (err) {
        console.error("❌ Erreur lors de la génération du rapport :", err.message);
        throw err; // Propager l'erreur pour que server.js puisse la capturer
    }
}

// --- EXPORTS ---
module.exports = { 
    sendDailySummary,
    envoyerRapportQuotidien: sendDailySummary // Alias pour compatibilité
};