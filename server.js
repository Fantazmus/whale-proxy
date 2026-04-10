const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const API_KEY = process.env.ETHERSCAN_KEY;

app.get("/tx/:address", async (req, res) => {
  try {
    const address = req.params.address;

    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const { data } = await axios.get(url);

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "proxy error" });
  }
});

app.get("/", (req, res) => {
  res.send("Whale Proxy Running 🐋");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});