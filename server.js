const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function fetchMVD(series, number) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "xn--b1ab2a0a.xn--b1aew.xn--p1ai",
      path: `/info-service.htm?sid=2000&form=RFPassportVerifyForm&uuid=&requestType=0&SERJA=${series}&NOMER=${number}`,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": "https://xn--b1ab2a0a.xn--b1aew.xn--p1ai/info-service.htm?sid=2000",
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = [];
      res.on("data", chunk => data.push(chunk));
      res.on("end", () => resolve(Buffer.concat(data).toString("utf8")));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

app.get("/check-passport", async (req, res) => {
  const { series, number } = req.query;

  if (!series || !number) return res.status(400).json({ error: "Укажите series и number" });
  if (!/^\d{4}$/.test(series) || !/^\d{6}$/.test(number)) return res.status(400).json({ error: "Серия — 4 цифры, номер — 6 цифр" });

  try {
    const html = await fetchMVD(series, number);

    let valid = null;
    let message = "";

    if (html.includes("действительный") || html.includes("Документ действителен") || html.includes("является действительным")) {
      valid = true;
      message = "Паспорт действителен";
    } else if (html.includes("недействительный") || html.includes("не действителен") || html.includes("Документ недействителен") || html.includes("является недействительным")) {
      valid = false;
      message = "Паспорт недействителен";
    } else if (html.includes("не найден") || html.includes("не числится")) {
      valid = false;
      message = "Паспорт не найден в базе";
    } else {
      message = "Не удалось определить статус";
      console.log("HTML от МВД:", html.slice(0, 800));
    }

    return res.json({ valid, message, series, number, htmlLength: html.length });

  } catch (err) {
    console.error("Ошибка:", err.message);
    return res.status(500).json({ error: "Ошибка соединения с МВД", details: err.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok", service: "passport-proxy" }));

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
