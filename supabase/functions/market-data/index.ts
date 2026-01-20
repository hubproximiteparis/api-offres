import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getFTToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = Deno.env.get('FT_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('FT_CLIENT_SECRET')?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Missing FT_CLIENT_ID or FT_CLIENT_SECRET in Supabase Secrets");
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  // AJOUT : api_labonneboitev2 ajouté au scope
  params.append('scope', 'api_offresdemploiv2 api_rome-fiches-metiersv1 api_labonneboitev2 o2dsoffre');

  const res = await fetch('https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const data = await res.json();
  if (data.error) throw new Error(`Auth FT Failed: ${data.error_description || data.error}`);

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return cachedToken;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = await getFTToken();
    const { action, metier, code_postal, query } = body;

    // --- ACTION : OFFRES D'EMPLOI ---
    if (action === 'get-offres') {
      const isRome = /^[A-N]\d{4}$/.test(metier); 
      const queryParam = isRome ? `codeROME=${metier}` : `motsCles=${encodeURIComponent(metier)}`;
      const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${queryParam}&commune=${code_postal}&distance=30`;
      
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.status === 204 || response.status === 404) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await response.json();
      return new Response(JSON.stringify(data.resultats || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACTION : MARCHÉ CACHÉ (LA BONNE BOITE) ---
    if (action === 'get-lbb') {
      // Note : LBB nécessite un code ROME. Si 'metier' n'est pas un code ROME, l'API risque de ne rien renvoyer.
      const lbbUrl = `https://api.francetravail.io/partenaire/labonneboite/v1/company/?rome_codes=${metier}&distance=30&zip_code=${code_postal}`;
      
      const response = await fetch(lbbUrl, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await response.json();
      return new Response(JSON.stringify(data.companies || []), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // --- ACTION : RECHERCHE ROME 4.0 ---
    if (action === 'search-rome') {
      const url = `https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/autocomplete?libelle=${encodeURIComponent(query)}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (response.status === 204) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Si aucune action ne correspond
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });

  } catch (err) {
    // CE BLOC EST ESSENTIEL : il renvoie l'erreur 500 si le code plante au-dessus
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});