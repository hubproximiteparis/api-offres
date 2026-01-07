import express from "express";
import axios from "axios";
import { getAccessToken } from "../franceTravailClient.mjs";

const router = express.Router();

router.get("/offres/search", async (req, res) => {
  try {
    const tokenData = await getAccessToken();
    const token = tokenData.access_token;

    const response = await axios.get(
      "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "TypeAuth": "partenaire", // 🔴 ESSENTIEL
          Accept: "application/json",
          "User-Agent": "api-offres/1.0"
        },
        params: req.query,
        validateStatus: () => true
      }
    );

    if (response.status === 204) {
      return res.json({ resultats: [] });
    }

    if (response.status >= 400) {
      return res.status(response.status).json({
        error: "Erreur France Travail",
        status: response.status,
        details: response.data
      });
    }

    res.json(response.data);

  } catch (err) {
    res.status(500).json({
      error: "Erreur serveur offres",
      message: err.message
    });
  }
});

export default router;
