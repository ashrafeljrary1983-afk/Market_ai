const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_KEY = process.env.TWELVE_DATA_API_KEY || process.env.TWELVE;


app.get('/', (req, res) => {
  res.json({ status: "Market AI Server is active and running successfully!" });
});

app.get('/api/analyze', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'XAU/USD';
    const interval = req.query.interval || '1h';

    if (!API_KEY) {
      return res.status(500).json({ error: "API Key is missing." });
    }

    const timeSeriesUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;
    const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;

    const [timeSeriesRes, rsiRes] = await Promise.all([
      axios.get(timeSeriesUrl),
      axios.get(rsiUrl)
    ]);

    if (timeSeriesRes.data.status === "error" || rsiRes.data.status === "error") {
      return res.status(400).json({ 
        error: "Twelve Data Error", 
        details: timeSeriesRes.data.message || rsiRes.data.message 
      });
    }

    const prices = timeSeriesRes.data.values || [];
    const latestPrice = prices[0] ? parseFloat(prices[0].close) : 0;
    const rsiValues = rsiRes.data.values || [];
    const latestRsi = rsiValues[0] ? parseFloat(rsiValues[0].value) : 50;

    let signal = "NEUTRAL";
    let summary = "السوق مستقر حالياً.";

    if (latestRsi >= 70) {
      signal = "SELL / OVERBOUGHT";
      summary = `مؤشر RSI وصل إلى ${latestRsi.toFixed(2)} وهي منطقة تشبع شرائي، احتمال هبوط تصحيحي.`;
    } else if (latestRsi <= 30) {
      signal = "BUY / OVERSOLD";
      summary = `مؤشر RSI وصل إلى ${latestRsi.toFixed(2)} وهي منطقة تشبع بيعي، احتمال ارتداد صعودياً.`;
    }

    res.json({
      symbol,
      latest_price: latestPrice,
      latest_rsi: latestRsi,
      signal,
      summary
    });

  } catch (error) {
    console.error("Fetch error details:", error.message);
    res.status(500).json({ error: "Failed to fetch market data.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
