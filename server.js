import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ETHERSCAN_KEY;

const EXCHANGES = [
  "0x28c6c06298d514db089934071355e5743bf21d60", // Binance
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549", // Binance hot wallet
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff"  // 0x exchange
];

// 🧠 HOME
app.get("/", (req, res) => {
  res.json({ status: "WHALE V5 AI MODE 🧠🐋" });
});

// 🔥 SMART MONEY ENDPOINT
app.get("/ai/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.result) return res.json([]);

    let inflow = 0;
    let outflow = 0;

    const txs = data.result.slice(0, 50).map(tx => {
      const value = Number(tx.value) / 1e18;

      const isIn = tx.to.toLowerCase() === address.toLowerCase();

      if (isIn) inflow += value;
      else outflow += value;

      const isExchange =
        EXCHANGES.includes(tx.from.toLowerCase()) ||
        EXCHANGES.includes(tx.to.toLowerCase());

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueETH: value,
        type: isIn ? "IN" : "OUT",
        exchange: isExchange ? "YES" : "NO",
        time: new Date(tx.timeStamp * 1000).toLocaleString()
      };
    });

    // 🧠 SMART SCORE CALC
    const score =
      inflow > outflow
        ? Math.min(100, 50 + (inflow - outflow) * 5)
        : Math.max(0, 50 - (outflow - inflow) * 5);

    res.json({
      address,
      inflow,
      outflow,
      smartMoneyScore: Math.round(score),
      whales: txs
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("WHALE V5 AI RUNNING 🧠🐋", PORT);
});
