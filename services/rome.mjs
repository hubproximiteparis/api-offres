import axios from "axios";
import { getAccessToken } from "../franceTravailClient.mjs";

export async function fetchRome() {
  const token = await getAccessToken();

  const response = await axios.get(
    `${process.env.FRANCE_TRAVAIL_API_BASE}/api/rome/v1/metiers`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return response.data;
}
