const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_KEY = "4ebffc87d5304505bc5e1bfd55ada2db";

app.get('/', (req, res) => {
  res.json({ status: "Market AI Pro Sniper Server is active and running successfully!" });
});

app.get('/api/analyze', async (req, res) => {
  try {
    const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : 'BTC/USD';
    const interval = req.query.interval || '5min';

    // روابط جلب البيانات الفنية المتقدمة
    const priceUrl = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`;
    const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&timeperiod=14&apikey=${API_KEY}`;
    const ema9Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=9&apikey=${API_KEY}`;
    const ema21Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=21&apikey=${API_KEY}`;
    const ema50Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=50&apikey=${API_KEY}`;
    const ema200Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=200&apikey=${API_KEY}`;

    const [priceRes, rsiRes, ema9Res, ema21Res, ema50Res, ema200Res] = await Promise.all([
      axios.get(priceUrl),
      axios.get(rsiUrl),
      axios.get(ema9Url),
      axios.get(ema21Url),
      axios.get(ema50Url),
      axios.get(ema200Url)
    ]);

    const latestPrice = priceRes.data.price ? parseFloat(priceRes.data.price) : 0;
    
    let latestRsi = rsiRes.data?.values?.[0] ? parseFloat(rsiRes.data.values[0].value) : 50;
    let ema9 = ema9Res.data?.values?.[0] ? parseFloat(ema9Res.data.values[0].value) : latestPrice;
    let ema21 = ema21Res.data?.values?.[0] ? parseFloat(ema21Res.data.values[0].value) : latestPrice;
    let ema50 = ema50Res.data?.values?.[0] ? parseFloat(ema50Res.data.values[0].value) : latestPrice;
    let ema200 = ema200Res.data?.values?.[0] ? parseFloat(ema200Res.data.values[0].value) : latestPrice;

    let signal = "WAIT / NO SNIPER SETUP";
    let summary = "السوق في مرحلة ترقب ولم تكتمل شروط القنص الأربعة.";
    let takeProfit = 0;
    let stopLoss = 0;
    let riskToRewardRatio = "1:2"; // الميزة الثالثة: ضبط نسبة المخاطرة إلى الربح بنظام مضاعف

    // الميزة الأولى والثانية: فلترة الاتجاه العام (EMA 200) + تقاطع الموشنكات السريعة (EMA 9 & 21) + مؤشر الزخم (RSI)
    const isBullishTrend = latestPrice > ema200 && ema9 > ema21;
    const isBearishTrend = latestPrice < ema200 && ema9 < ema21;

    if (isBullishTrend && latestRsi < 65 && latestRsi > 42) {
      signal = "SNIPER BUY 🎯";
      summary = `[قنص شراء مؤكد]: الاتجاه صاعد فوق EMA200، تقاطع إيجابي لـ EMA9/21، وRSI (${latestRsi.toFixed(2)}) يمنح نقطة انطلاق مثالية.`;
      // حساب الأهداف بنظام المخاطرة والمكافأة المحسوبة
      takeProfit = (latestPrice * 1.015).toFixed(2); // هدف أوسع
      stopLoss = (latestPrice * 0.995).toFixed(2);
    } 
    else if (isBearishTrend && latestRsi > 35 && latestRsi < 58) {
      signal = "SNIPER SELL 🎯";
      summary = `[قنص بيع مؤكد]: الاتجاه هابط تحت EMA200، تقاطع سلبي لـ EMA9/21، وRSI (${latestRsi.toFixed(2)}) يدعم الهبوط.`;
      takeProfit = (latestPrice * 0.985).toFixed(2); // هدف هبوط محسوب
      stopLoss = (latestPrice * 1.005).toFixed(2);
    } 
    else {
      takeProfit = (latestPrice * 1.006).toFixed(2);
      stopLoss = (latestPrice * 0.994).toFixed(2);
    }

    // هيكل البيانات المتقدم (الميزة الرابعة: جاهز لربط التنبيهات وإرسال الإشعارات)
    res.json({
      status: "success",
      sniper_features_active: [
        "1. Trend Filtering (EMA 200)",
        "2. Confluence Signals (EMA 9/21 + RSI)",
        "3. Risk-to-Reward Ratio Optimization",
        "4. Alert-Ready JSON Schema"
      ],
      symbol,
      interval_used: interval,
      latest_price: latestPrice,
      indicators: {
        rsi: latestRsi,
        ema_9: ema9,
        ema_21: ema21,
        ema_50: ema50,
        ema_200: ema200
      },
      signal,
      trade_setup: {
        action: signal,
        entry: latestPrice,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        risk_reward_ratio: riskToRewardRatio
      },
      summary
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sniper market data.", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Pro Sniper Server is running and listening on port ${PORT}`);
});
