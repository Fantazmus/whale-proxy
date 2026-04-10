import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ETHERSCAN_KEY;

// 🏦 exchange wallets (heuristic)
const EXCHANGES = new Set([
  "0x28c6c06298d514db089934071355e5743bf21d60",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
]);

// 🧠 clustering helper (simple wallet grouping)
function clusterWallet(addr) {
  const last = addr.slice(-2);
  if (["a", "b", "c", "d"].includes(last)) return "SMART MONEY";
  if (["e", "f", "0", "1"].includes(last)) return "RETAIL";
  return "UNKNOWN";
}

app.get("/", (req, res) => {
  res.json({ status: "WHALE V8 BLACKROCK MODE ACTIVE 🧠🐋" });
});

app.get("/blackrock/:address", async (req, res) => {
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

      const cluster = clusterWallet(tx.from.toLowerCase());

      if (isIn) inflow += value;
      else outflow += value;

      if (value > 40) whaleCount++;

      if (isExchange) exchangeFlow += value;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueETH: value,
        type: isIn ? "IN" : "OUT",
        exchange: isExchange,
        cluster,
        whale: value > 40,
        time: new Date(tx.timeStamp * 1000).toLocaleString()
      };
    });

    // 🧠 BLACKROCK SCORE ENGINE
    const net = inflow - outflow;

    const liquidityPressure = exchangeFlow * 0.3;
    const whalePower = whaleCount * 12;
    const smartFlow = net * 4;

    let score = 50 + smartFlow + whalePower - liquidityPressure;

    score = Math.max(0, Math.min(100, score));

    const signal =
      score > 70
        ? "🟢 INSTITUTIONAL ACCUMULATION"
        : score < 30
        ? "🔴 DISTRIBUTION PHASE"
        : "🟡 NEUTRAL FLOW";

    res.json({
      address,
      inflow,
      outflow,
      netFlow: net,
      whaleCount,
      exchangeFlow,
      liquidityPressure,
      blackrockScore: Math.round(score),
      signal,
      txs: enriched
    });

  } catch (e) {
    res.status(500).json({
      error: "BLACKROCK MODE FAILED",
      message: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log("🐋 WHALE V8 BLACKROCK MODE RUNNING", PORT);
});
