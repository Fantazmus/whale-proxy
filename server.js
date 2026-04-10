import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ FIX CORS (важно для uCoz / сайтов)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ETHERSCAN_KEY;

// 🧠 HEALTH CHECK
app.get("/", (req, res) => {
  res.json({
    status: "WHALE V4 ONLINE 🐋",
    time: new Date().toISOString()
  });
});

// 🔥 WHALE TX (ETH MAINNET)
app.get("/eth/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.status === "0") {
      return res.json([]);
    }

    const result = (data.result || []).slice(0, 25).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueETH: Number(tx.value) / 1e18,
      time: new Date(tx.timeStamp * 1000).toLocaleString(),
      type: tx.from.toLowerCase() === address.toLowerCase() ? "OUT" : "IN"
    }));

    res.json(result);

  } catch (err) {
    res.status(500).json({
      error: "SERVER ERROR",
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("🐋 WHALE V4 RUNNING ON PORT", PORT);
});
