import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*", // можно потом заменить на свой домен
}));

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.ETHERSCAN_KEY;

app.get("/", (req, res) => {
  res.send("WHALE PROXY OK 🐋");
});

app.get("/eth/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    res.json(data.result || []);

  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("RUNNING ON", PORT);
});
