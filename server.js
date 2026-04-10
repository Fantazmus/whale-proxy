import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.ETHERSCAN_KEY;

app.get("/", (req, res) => {
  res.send("WHALE V3 OK 🐋");
});

app.get("/eth/:address", async (req, res) => {
  const address = req.params.address;

  try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&sort=desc&apikey=${API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    // 🔥 DEBUG (очень важно)
    console.log(data);

    if (!data || !data.result || !Array.isArray(data.result)) {
      return res.json({
        error: "NO DATA OR API LIMIT",
        raw: data
      });
    }

    const result = data.result.slice(0, 20).map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueETH: Number(tx.value) / 1e18,
      time: new Date(tx.timeStamp * 1000).toLocaleString(),
      type: tx.from.toLowerCase() === address.toLowerCase() ? "OUT" : "IN"
    }));

    res.json(result);

  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("RUNNING ON", PORT);
});
