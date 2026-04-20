import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HOST = process.env.HOST || "0.0.0.0";
const PORT = clampInteger(process.env.PORT, 3000, 1, 65535);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const ETHERSCAN_API_KEY = String(process.env.ETHERSCAN_KEY || "").trim();
const DEFAULT_LIMIT = clampInteger(process.env.DEFAULT_TX_LIMIT, 80, 10, 150);
const DEFAULT_WHALE_THRESHOLD = clampNumber(process.env.WHALE_THRESHOLD_ETH, 40, 1, 5000);
const REQUEST_TIMEOUT_MS = clampInteger(process.env.REQUEST_TIMEOUT_MS, 12000, 2000, 60000);
const CACHE_TTL_MS = clampInteger(process.env.CACHE_TTL_MS, 15000, 1000, 300000);

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const EXCHANGES = new Set([
  "0x28c6c06298d514db089934071355e5743bf21d60",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff"
]);

const responseCache = new Map();

function clampInteger(rawValue, fallback, min, max) {
  const parsed = Number.parseInt(rawValue, 10);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, safeValue));
}

function clampNumber(rawValue, fallback, min, max) {
  const parsed = Number(rawValue);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(max, Math.max(min, safeValue));
}

function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function formatTimestamp(timestamp) {
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "N/A";
  }

  return new Date(numeric * 1000).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function clusterWallet(address) {
  const normalized = normalizeAddress(address);
  const lastChar = normalized.slice(-1);

  if (["a", "b", "c", "d"].includes(lastChar)) {
    return "SMART MONEY";
  }

  if (["e", "f", "0", "1"].includes(lastChar)) {
    return "RETAIL";
  }

  return "UNKNOWN";
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "whale-v8-blackrock/9.0"
        },
        timeout: REQUEST_TIMEOUT_MS
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Etherscan returned HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (error) {
            reject(new Error("Invalid JSON returned by Etherscan"));
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Etherscan request timed out"));
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

function buildEtherscanUrl(address) {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "1");
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", ETHERSCAN_API_KEY);
  return url.toString();
}

function buildSignal(score) {
  if (score >= 70) {
    return "INSTITUTIONAL ACCUMULATION";
  }

  if (score <= 30) {
    return "DISTRIBUTION PHASE";
  }

  return "NEUTRAL FLOW";
}

function buildScore({ netFlow, whaleCount, exchangeFlow, smartMoneyCount, whaleThreshold }) {
  const normalizedNet = clampNumber(netFlow / Math.max(whaleThreshold, 1), 0, -25, 25);
  const whalePower = clampNumber(whaleCount * 6, 0, 0, 30);
  const smartMoneyBonus = clampNumber(smartMoneyCount * 4, 0, 0, 16);
  const exchangePenalty = clampNumber(exchangeFlow * 0.12, 0, 0, 24);

  const score = 50 + normalizedNet + whalePower + smartMoneyBonus - exchangePenalty;
  return Math.round(clampNumber(score, 50, 0, 100));
}

function getCachedPayload(cacheKey) {
  const entry = responseCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    responseCache.delete(cacheKey);
    return null;
  }

  return entry.payload;
}

function setCachedPayload(cacheKey, payload) {
  responseCache.set(cacheKey, {
    savedAt: Date.now(),
    payload
  });
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "WHALE V8 BLACKROCK MODE",
    endpoints: {
      dashboard: "/dashboard",
      health: "/health",
      wallet: "/blackrock/:address?limit=80&whaleThreshold=40"
    }
  });
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "whale-v8-blackrock.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    etherscanConfigured: Boolean(ETHERSCAN_API_KEY),
    cacheTtlMs: CACHE_TTL_MS,
    requestTimeoutMs: REQUEST_TIMEOUT_MS
  });
});

app.get("/blackrock/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  const limit = clampInteger(req.query.limit, DEFAULT_LIMIT, 10, 150);
  const whaleThreshold = clampNumber(req.query.whaleThreshold, DEFAULT_WHALE_THRESHOLD, 1, 5000);

  if (!isValidAddress(address)) {
    res.status(400).json({
      error: "INVALID_ADDRESS",
      message: "A valid Ethereum address is required."
    });
    return;
  }

  if (!ETHERSCAN_API_KEY) {
    res.status(503).json({
      error: "MISSING_ETHERSCAN_KEY",
      message: "Set ETHERSCAN_KEY in your environment before using this endpoint."
    });
    return;
  }

  const cacheKey = `${address}:${limit}:${whaleThreshold}`;
  const cached = getCachedPayload(cacheKey);
  if (cached) {
    res.json({
      ...cached,
      cached: true
    });
    return;
  }

  try {
    const payload = await getJson(buildEtherscanUrl(address));
    const rawResult = Array.isArray(payload.result) ? payload.result : [];

    if (payload.status === "0" && payload.message === "NOTOK") {
      throw new Error(typeof payload.result === "string" ? payload.result : "Etherscan returned an error");
    }

    const txs = rawResult.slice(0, limit);

    let inflow = 0;
    let outflow = 0;
    let whaleCount = 0;
    let whaleVolume = 0;
    let exchangeFlow = 0;
    let smartMoneyCount = 0;

    const enriched = txs.map((tx) => {
      const from = normalizeAddress(tx.from);
      const to = normalizeAddress(tx.to);
      const valueETH = Number(tx.value) / 1e18;
      const safeValue = Number.isFinite(valueETH) ? valueETH : 0;
      const isInbound = to === address;
      const counterparty = isInbound ? from : to;
      const isExchange = EXCHANGES.has(from) || EXCHANGES.has(to);
      const cluster = clusterWallet(counterparty);
      const isWhale = safeValue >= whaleThreshold;

      if (isInbound) {
        inflow += safeValue;
      } else {
        outflow += safeValue;
      }

      if (isExchange) {
        exchangeFlow += safeValue;
      }

      if (isWhale) {
        whaleCount += 1;
        whaleVolume += safeValue;
      }

      if (cluster === "SMART MONEY") {
        smartMoneyCount += 1;
      }

      return {
        hash: tx.hash || "",
        from: tx.from || "",
        to: tx.to || "",
        valueETH: Number(safeValue.toFixed(4)),
        type: isInbound ? "IN" : "OUT",
        exchange: isExchange,
        cluster,
        whale: isWhale,
        blockNumber: tx.blockNumber || "",
        timeStamp: Number(tx.timeStamp) || 0,
        time: formatTimestamp(tx.timeStamp)
      };
    });

    const netFlow = Number((inflow - outflow).toFixed(4));
    const blackrockScore = buildScore({
      netFlow,
      whaleCount,
      exchangeFlow,
      smartMoneyCount,
      whaleThreshold
    });
    const responsePayload = {
      address,
      limit,
      whaleThreshold,
      inflow: Number(inflow.toFixed(4)),
      outflow: Number(outflow.toFixed(4)),
      netFlow,
      whaleCount,
      whaleVolume: Number(whaleVolume.toFixed(4)),
      smartMoneyCount,
      exchangeFlow: Number(exchangeFlow.toFixed(4)),
      blackrockScore,
      signal: buildSignal(blackrockScore),
      txs: enriched,
      fetchedAt: new Date().toISOString(),
      cached: false
    };

    setCachedPayload(cacheKey, responsePayload);
    res.json(responsePayload);
  } catch (error) {
    res.status(502).json({
      error: "BLACKROCK_MODE_FAILED",
      message: error.message || "Unknown upstream error"
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`WHALE V8 BLACKROCK MODE RUNNING http://${HOST}:${PORT}`);
});
