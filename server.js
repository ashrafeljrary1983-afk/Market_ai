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
    const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : 'BTC/USD';
    const interval = req.query.interval || '5min';

    const priceUrl = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`;
    // استخدام فترات زمنية متوافقة تماماً مع API لمؤشر RSI
    const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&timeperiod=14&apikey=${API_KEY}`;

    const [priceRes, rsiRes] = await Promise.all([
      axios.get(priceUrl),
      axios.get(rsiUrl)
    ]);

    const latestPrice = priceRes.data.price ? parseFloat(priceRes.data.price) : 0;
    
    // قراءة قيمة RSI بشكل دقيق وآمن
    let latestRsi = 50;
    if (rsiRes.data && rsiRes.data.values && rsiRes.data.values.length > 0) {
      latestRsi = parseFloat(rsiRes.data.values[0].value);
    }

    let signal = "NEUTRAL";
    let summary = "السوق مستقر حالياً، انتظر تأكيد الحركة.";
    let takeProfit = 0;
    let stopLoss = 0;

    // مستويات الحساسية المحدثة
    if (latestRsi >= 60) {
      signal = "SELL / OVERBOUGHT (Sensitive)";
      summary = `مؤشر RSI وصل إلى (${latestRsi.toFixed(2)}) - إشارة بيع مبكرة وسريعة.`;
      takeProfit = (latestPrice * 0.992).toFixed(2);
      stopLoss = (latestPrice * 1.003).toFixed(2);
    } else if (latestRsi <= 40) {
      signal = "BUY / OVERSOLD (Sensitive)";
      summary = `مؤشر RSI هبط إلى (${latestRsi.toFixed(2)}) - إشارة شراء مبكرة وسريعة.`;
      takeProfit = (latestPrice * 1.008).toFixed(2);
      stopLoss = (latestPrice * 0.997).toFixed(2);
    } else {
      takeProfit = (latestPrice * 1.005).toFixed(2);
      stopLoss = (latestPrice * 0.995).toFixed(2);
    }

    res.json({
      symbol,
      interval_used: interval,
      latest_price: latestPrice,
      latest_rsi: latestRsi,
      signal,
      trade_setup: {
        action: signal,
        entry: latestPrice,
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
