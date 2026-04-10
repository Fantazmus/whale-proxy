import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ETHERSCAN_KEY;

// 🏦 exchange heuristics
const EXCHANGES = new Set([
  "0x28c6c06298d514db089934071355e5743bf21d60", // Binance
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
  "0x6fb624b48d9299674022a23d92515e76ba880113"  // Coinbase (example)
]);

// 🧠 HOME
app.get("/", (req, res) => {
  res.json({ status: "WHALE V6 GOD MODE ACTIVE 🧠🐋🔥" });
});

// 🚀 CORE ENGINE
app.get("/god/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.result) return res.json([]);

    const txs = data.result.slice(0, 80);

    let inflow = 0;
    let outflow = 0;
    let whaleCount = 0;
    let exchangeFlow = 0;

    const enriched = txs.map(tx => {
      const value = Number(tx.value) / 1e18;

      const isIn = tx.to.toLowerCase() === address.toLowerCase();
      const isExchange =
        EXCHANGES.has(tx.from.toLowerCase()) ||
        EXCHANGES.has(tx.to.toLowerCase());

      if (isIn) inflow += value;
      else outflow += value;

      if (value > 50) whaleCount++; // 🐋 whale threshold

      if (isExchange) exchangeFlow += value;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueETH: value,
        type: isIn ? "IN" : "OUT",
        exchange: isExchange,
        time: new Date(tx.timeStamp * 1000).toLocaleString(),
        whale: value > 50
      };
    });

    // 🧠 GOD SCORE ENGINE (improved)
    const netFlow = inflow - outflow;
    const activity = whaleCount * 10;
    const exchangePressure = exchangeFlow * 0.2;

    let score = 50 + netFlow * 3 + activity - exchangePressure;

    score = Math.max(0, Math.min(100, score));

    // 📊 SPIKE DETECTION
    const spike =
      whaleCount > 3 && inflow > outflow
        ? "🔥 WHALE ACCUMULATION SPIKE"
        : whaleCount > 3 && outflow > inflow
        ? "⚠️ WHALE DISTRIBUTION SPIKE"
        : "NORMAL FLOW";

    res.json({
      address,
      inflow,
      outflow,
      netFlow,
      whaleCount,
      exchangeFlow,
      smartMoneyScore: Math.round(score),
      signal: spike,
      txs: enriched
    });

  } catch (e) {
    res.status(500).json({
      error: "GOD MODE FAILED",
      message: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log("🐋 WHALE V6 GOD MODE RUNNING", PORT);
});
