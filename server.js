const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

app.get('/', (req, res) => {
    res.json({ status: "Market AI Server is active and running successfully!" });
});

app.get('/api/analyze', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'XAU/USD';
        const interval = req.query.interval || '1h';

        if (!TWELVE_DATA_API_KEY) {
            return res.status(500).json({ error: "API Key is missing in environment variables." });
        }

        const timeSeriesUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=10&apikey=${TWELVE_DATA_API_KEY}`;
        const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&time_period=14&apikey=${TWELVE_DATA_API_KEY}`;

        const [timeSeriesRes, rsiRes] = await Promise.all([
            axios.get(timeSeriesUrl),
            axios.get(rsiUrl)
        ]);

        const prices = timeSeriesRes.data.values || [];
        const latestPrice = prices[0] ? parseFloat(prices[0].close) : 0;
        const rsiValues = rsiRes.data.values || [];
        const latestRsi = rsiValues[0] ? parseFloat(rsiValues[0].value) : 50;

        let signal = "NEUTRAL";
        let summary = "السوق مستقر حالياً.";

        if (latestRsi >= 70) {
            signal = "SELL / OVERBOUGHT";
            summary = `مؤشر RSI وصل إلى (${latestRsi.toFixed(2)}) وهي منطقة تشبع شرائي، احتمل هبوطاً تصحيحياً.`;
        } else if (latestRsi <= 30) {
            signal = "BUY / OVERSOLD";
            summary = `مؤشر RSI وصل إلى (${latestRsi.toFixed(2)}) وهي منطقة تشبع بيعي، احتمل ارتداداً صعودياً.`;
        }

        res.json({
            symbol,
            latest_price: latestPrice,
            rsi: latestRsi,
            analysis: { signal, summary },
            recent_candles: prices.slice(0, 3)
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch market data." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running and listening on port ${PORT}`);
});
