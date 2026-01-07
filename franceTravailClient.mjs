import axios from "axios";

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getAccessToken() {
  const now = Date.now();

  // Token encore valide → cache
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", process.env.FRANCE_TRAVAIL_CLIENT_ID);
  params.append("client_secret", process.env.FRANCE_TRAVAIL_CLIENT_SECRET);
  params.append("scope", process.env.FRANCE_TRAVAIL_SCOPE);

  const response = await axios.post(
    process.env.FRANCE_TRAVAIL_TOKEN_URL,
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  cachedToken = response.data.access_token;
  tokenExpiresAt = now + (response.data.expires_in - 60) * 1000;

  console.log("🔐 Token France Travail rafraîchi");

  return cachedToken;
}
