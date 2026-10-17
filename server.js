const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// استخدام البورت الذي تفرضه منصة Render تلقائياً أو البورت 3000 للاختبار المحلي
const PORT = process.env.PORT || 3000;
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// الصفحة الرئيسية للتأكد من عمل الخادم
app.get('/', (req, res) => {
    res.json({ message: "Market AI Server is running smoothly!" });
});

// مسار جلب وتحليل بيانات الذهب والأصول المالية
app.get('/api/analyze', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'XAU/USD';
        const interval = req.query.interval || '1h';

        if (!TWELVE_DATA_API_KEY) {
            return res.status(500).json({ error: "Missing Twelve Data API Key in environment variables." });
        }

        const timeSeriesUrl = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=20&apikey=${TWELVE_DATA_API_KEY}`;
        const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&time_period=14&apikey=${TWELVE_DATA_API_KEY}`;

        const [timeSeriesRes, rsiRes] = await Promise.all([
            axios.get(timeSeriesUrl),
            axios.get(rsiUrl)
        ]);

        if (timeSeriesRes.data.status === 'error') {
            return res.status(400).json({ error: timeSeriesRes.data.message });
        }

        const prices = timeSeriesRes.data.values || [];
        const latestPrice = prices[0] ? parseFloat(prices[0].close) : null;
        const rsiValues = rsiRes.data.values || [];
        const latestRsi = rsiValues[0] ? parseFloat(rsiValues[0].value) : null;

        let signal = "NEUTRAL";
        let summary = "السوق في حالة حياد.";

        if (latestRsi) {
            if (latestRsi >= 70) {
                signal = "SELL / OVERBOUGHT";
                summary = `مؤشر RSI بلغ (${latestRsi.toFixed(2)}) وهو في منطقة تشبع شرائي، قد تشهد الأسعار تصحيحاً هبوطياً.`;
            } else if (latestRsi <= 30) {
                signal = "BUY / OVERSOLD";
                summary = `مؤشر RSI بلغ (${latestRsi.toFixed(2)}) وهو في منطقة تشبع بيعي، هناك احتمال لارتداد صعودي.`;
            } else {
                summary = `مؤشر RSI عند المستوى (${latestRsi.toFixed(2)}). الاتجاه متزن حالياً.`;
            }
        }

        res.json({
            symbol,
            interval,
            latest_price: latestPrice,
            rsi: latestRsi,
            analysis: {
                signal,
                summary
            },
            recent_candles: prices.slice(0, 5)
        });

    } catch (error) {
        console.error("Analysis Error:", error.message);
        res.status(500).json({ error: "Failed to fetch market data from Twelve Data." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
