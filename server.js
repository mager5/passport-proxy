const express = require("express");
const cors = require("cors");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function postMVD(series, number) {
  return new Promise((resolve, reject) => {
    const postData = "SERJA=" + series + "&NOMER=" + number + "&requestType=0&form=RFPassportVerifyForm&uuid=";

    const options = {
      hostname: "xn--b1agjhrfhd.xn--b1ab2a0a.xn--b1aew.xn--p1ai",
      path: "/info-service.htm",
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
        "Referer": "https://xn--b1agjhrfhd.xn--b1ab2a0a.xn--b1aew.xn--p1ai/info-service.htm",
        "Connection": "keep-alive",
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
    req.write(postData);
    req.end();
  });
}

app.get("/check-passport", async (req, res) => {
  const { series, number } = req.query;

  if (!series || !number) return res.status(400).json({ error: "Ukajite series i number" });
  if (!/^\d{4}$/.test(series) || !/^\d{6}$/.test(number)) return res.status(400).json({ error: "Seriya 4 cifry, nomer 6 cifr" });

  try {
    const html = await postMVD(series, number);

    let valid = null;
    let message = "";

    if (html.includes("действительный") || html.includes("Документ действителен") || html.includes("является действительным")) {
      valid = true;
      message = "действителен";
    } else if (html.includes("недействительный") || html.includes("не действителен") || html.includes("Документ недействителен") || html.includes("является недействительным")) {
      valid = false;
      message = "недействителен";
    } else if (html.includes("не найден") || html.includes("не числится")) {
      valid = false;
      message = "не найден в базе";
    } else {
      message = "статус не определен";
    }

    return res.json({ valid, message, series, number, htmlLength: html.length, htmlRaw: html.slice(0, 2000) });

  } catch (err) {
    return res.status(500).json({ error: "error", details: err.message });
  }
});

app.get("/", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, function() { console.log("Server started on port " + PORT); });
