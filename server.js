const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_KEY = "4ebffc87d5304505bc5e1bfd55ada2db";

app.get('/', (req, res) => {
  res.json({ status: "Market AI Server is active and running successfully!" });
});

app.get('/api/analyze', async (req, res) => {
  try {
    const symbol = req.query.symbol || 'SOL/USD';
    const interval = req.query.interval || '1h';

    const timeSeriesUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;
    const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`;

    const [timeSeriesRes, rsiRes] = await Promise.all([
      axios.get(timeSeriesUrl),
      axios.get(rsiUrl)
    ]);

    const prices = timeSeriesRes.data.values || [];
    const latestPrice = prices[0] ? parseFloat(prices[0].close) : 0;
    const rsiValues = rsiRes.data.values || [];
    const latestRsi = rsiValues[0] ? parseFloat(rsiValues[0].value) : 50;

    let signal = "NEUTRAL";
    let summary = "السوق مستقر حالياً، انتظر تأكيد الحركة.";
    let entryPrice = latestPrice;
    let takeProfit = 0;
    let stopLoss = 0;

    if (latestRsi >= 70) {
      signal = "SELL / OVERBOUGHT";
      summary = `مؤشر RSI مرتفع (${latestRsi.toFixed(2)}) منطقة تشبع شرائي، احتمال هبوط تصحيحي.`;
      takeProfit = (latestPrice - 8).toFixed(2);
      stopLoss = (latestPrice + 4).toFixed(2);
    } else if (latestRsi <= 30) {
      signal = "BUY / OVERSOLD";
      summary = `مؤشر RSI منخفض (${latestRsi.toFixed(2)}) منطقة تشبع بيعي، احتمال ارتداد صعودياً.`;
      takeProfit = (latestPrice + 8).toFixed(2);
      stopLoss = (latestPrice - 4).toFixed(2);
    } else {
      takeProfit = (latestPrice + 5).toFixed(2);
      stopLoss = (latestPrice - 5).toFixed(2);
    }

    res.json({
      symbol,
      latest_price: latestPrice,
      latest_rsi: latestRsi,
      signal,
      trade_setup: {
        action: signal,
        entry: entryPrice,
        take_profit: takeProfit,
        stop_loss: stopLoss
      },
      summary
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market data.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
