console.log("🟢 INDEX.MJS CHARGÉ", new Date().toISOString());

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

import offresRoutes from "./routes/offres.mjs";
import romeRoutes from "./routes/rome.mjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let globalToken = null;

// ===============================
// Healthcheck
// ===============================
app.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

// ===============================
// Debug ENV
// ===============================
app.get("/debug/env", (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_ID_LEN: process.env.FRANCE_TRAVAIL_CLIENT_ID?.length,
    CLIENT_SECRET_LEN: process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.length,
    TOKEN_URL: process.env.FRANCE_TRAVAIL_TOKEN_URL
  });
});

// ===============================
// Récupération du token OAuth2
// ===============================
app.get("/debug/token/get", async (req, res) => {
  try {
    const auth = Buffer.from(
      `${process.env.FRANCE_TRAVAIL_CLIENT_ID}:${process.env.FRANCE_TRAVAIL_CLIENT_SECRET}`
    ).toString("base64");

    const r = await fetch(
      "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const data = await r.json();

    if (!data.access_token) {
      return res.status(500).json(data);
    }

    globalToken = data.access_token;

    res.json({
      message: "Token récupéré",
      expires_in: data.expires_in
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// Routes métier
// ===============================
app.use("/api", offresRoutes);
app.use("/api", romeRoutes);

// ===============================
// Route 404 — TOUJOURS À LA FIN
// ===============================
app.get("*", (req, res) => {
  res.status(404).json({
    error: "Route inconnue",
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API prête sur http://localhost:${PORT}`);
});
