import express from "express";
import axios from "axios";
import { getAccessToken } from "../franceTravailClient.mjs";

const router = express.Router();

/**
 * GET /api/metiers/rome
 */
router.get("/metiers/rome", async (req, res) => {
  try {
    const tokenData = await getAccessToken();
    const token = tokenData.access_token;

    const response = await axios.get(
      "https://api.francetravail.io/partenaire/rome/v1/metiers",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "TypeAuth": "partenaire", // 🔴 OBLIGATOIRE
          Accept: "application/json",
          "User-Agent": "api-offres/1.0"
        },
        params: req.query,
        validateStatus: () => true
      }
    );

    if (response.status >= 400) {
      return res.status(response.status).json({
        error: "Erreur API ROME",
        details: response.data
      });
    }

    res.json(response.data);

  } catch (err) {
    res.status(500).json({
      error: "Erreur serveur ROME",
      message: err.message
    });
  }
});

export default router;
