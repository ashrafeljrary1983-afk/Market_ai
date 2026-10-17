const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const API_KEY = "4ebffc87d5304505bc5e1bfd55ada2db";

// إعدادات بوت تيليجرام الخاص بك
const TELEGRAM_BOT_TOKEN = "8820098367:AAE1ZCWRXj4QQeR5I8KJYkEvtEmJeHEv5OE";
const TELEGRAM_CHAT_ID = "7707212452";

// دالة إرسال التنبيهات إلى تيليجرام
async function sendTelegramAlert(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log("Telegram alert sent successfully!");
  } catch (error) {
    console.error("Failed to send telegram alert:", error.message);
  }
}

app.get('/', (req, res) => {
  res.json({ status: "Market AI Auto-Sniper Telegram Bot Server is active and running!" });
});

// دالة تحليل أصل معين وفحص فرصة القنص
async function analyzeAndCheckSymbol(symbol) {
  try {
    const interval = '5min';
    const priceUrl = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`;
    const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${symbol}&interval=${interval}&timeperiod=14&apikey=${API_KEY}`;
    const ema9Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=9&apikey=${API_KEY}`;
    const ema21Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=21&apikey=${API_KEY}`;
    const ema200Url = `https://api.twelvedata.com/ema?symbol=${symbol}&interval=${interval}&timeperiod=200&apikey=${API_KEY}`;

    const [priceRes, rsiRes, ema9Res, ema21Res, ema200Res] = await Promise.all([
      axios.get(priceUrl),
      axios.get(rsiUrl),
      axios.get(ema9Url),
      axios.get(ema21Url),
      axios.get(ema200Url)
    ]);

    const latestPrice = priceRes.data.price ? parseFloat(priceRes.data.price) : 0;
    let latestRsi = rsiRes.data?.values?.[0] ? parseFloat(rsiRes.data.values[0].value) : 50;
    let ema9 = ema9Res.data?.values?.[0] ? parseFloat(ema9Res.data.values[0].value) : latestPrice;
    let ema21 = ema21Res.data?.values?.[0] ? parseFloat(ema21Res.data.values[0].value) : latestPrice;
    let ema200 = ema200Res.data?.values?.[0] ? parseFloat(ema200Res.data.values[0].value) : latestPrice;

    const isBullishTrend = latestPrice > ema200 && ema9 > ema21;
    const isBearishTrend = latestPrice < ema200 && ema9 < ema21;

    let signal = "WAIT";
    let takeProfit = 0;
    let stopLoss = 0;
    let summary = "";

    if (isBullishTrend && latestRsi < 65 && latestRsi > 42) {
      signal = "SNIPER BUY 🎯";
      takeProfit = (latestPrice * 1.015).toFixed(2);
      stopLoss = (latestPrice * 0.995).toFixed(2);
      summary = `🚀 *فرصة قنص شراء جديدة!*\n*العملة:* ${symbol}\n*السعر الحالي:* ${latestPrice}\n*هدف الربح:* ${takeProfit}\n*وقف الخسارة:* ${stopLoss}\n*مؤشر RSI:* ${latestRsi.toFixed(2)}`;
      
      // إرسال التنبيه تلقائياً على تيليجرام
      await sendTelegramAlert(summary);
    } 
    else if (isBearishTrend && latestRsi > 35 && latestRsi < 58) {
      signal = "SNIPER SELL 🎯";
      takeProfit = (latestPrice * 0.985).toFixed(2);
      stopLoss = (latestPrice * 1.005).toFixed(2);
      summary = `🔻 *فرصة قنص بيع جديدة!*\n*العملة:* ${symbol}\n*السعر الحالي:* ${latestPrice}\n*هدف الربح:* ${takeProfit}\n*وقف الخسارة:* ${stopLoss}\n*مؤشر RSI:* ${latestRsi.toFixed(2)}`;
      
      // إرسال التنبيه تلقائياً على تيليجرام
      await sendTelegramAlert(summary);
    }

    return { symbol, latestPrice, signal, rsi: latestRsi };
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error.message);
  }
}

// فحص دوري تلقائي كل 15 دقيقة للأصول الثلاثة (الذهب، سولانا، الريبل)
setInterval(async () => {
  console.log("Running automated market sniper scan...");
  await analyzeAndCheckSymbol('XAU/USD');
  await analyzeAndCheckSymbol('SOL/USD');
  await analyzeAndCheckSymbol('XRP/USD');
}, 15 * 60 * 1000); // كل 15 دقيقة

// نقطة نهاية يويتش لطلب الفحص اليدوي الفوري أيضاً إن رغبت
app.get('/api/analyze', async (req, res) => {
  const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : 'XAU/USD';
  const result = await analyzeAndCheckSymbol(symbol);
  res.json({ status: "Checked successfully", result });
});

app.listen(PORT, () => {
  console.log(`Auto-Sniper Telegram Bot Server is running on port ${PORT}`);
});
