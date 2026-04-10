import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.ETHERSCAN_KEY;

// 🎯 helper: detect whale tier
function classifyWhale(valueEth) {
  if (valueEth > 1000) return "MEGA WHALE 🐋";
  if (valueEth > 200) return "WHALE 🐋";
  if (valueEth > 50) return "SMART MONEY 🧠";
  return "RETAIL";
}

// 🔥 ETH TX
app.get("/eth/:address", async (req, res) => {
  const { address } = req.params;

  const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.result) return res.json({ error: "no data" });

    const cleaned = data.result.slice(0, 20).map(tx => {
      const ethValue = Number(tx.value) / 1e18;

      return {
        time: new Date(tx.timeStamp * 1000).toLocaleString(),
        from: tx.from,
        to: tx.to,
        valueETH: ethValue,
        type: tx.from.toLowerCase() === address.toLowerCase() ? "OUT" : "IN",
        label: classifyWhale(ethValue),
        hash: tx.hash
      };
    });

    res.json(cleaned);
  } catch (e) {
    res.json({ error: e.message });
  }
});

// 🟡 BSC SUPPORT
app.get("/bsc/:address", async (req, res) => {
  const { address } = req.params;

  const url = `https://api.etherscan.io/v2/api?chainid=56&module=account&action=txlist&address=${address}&apikey=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  res.json(data.result || []);
});

app.get("/", (req, res) => {
  res.send("WHALE V3 PRO 🐋 RUNNING");
});

app.listen(PORT, () => {
  console.log("WHALE V3 RUNNING ON", PORT);
});
