const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const port = 3000;

app.use(bodyParser.json());

const scanForLinks = async (page) => {
  // console.log(page);
  return page.evaluate(() => {
    const aWithBr = document.querySelectorAll("a:has(br)");
    const hrefs = [];

    for (const anchor of aWithBr) {
      if (anchor.hasAttribute("href")) {
        hrefs.push(anchor.getAttribute("href"));
      }
    }

    return hrefs;
  });
};

let browser;

const run = async (searchText) => {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true });
  }
  const page = await browser.newPage();

  console.log(`Starting to search by: ${searchText}`);
  const url = `https://www.google.com/search?q=${searchText}`;

  await page.goto(url, { waitUntil: "domcontentloaded" });
  const hrefs = await scanForLinks(page);

  await page.close();

  return hrefs.slice(0, 5); // Return the first 5 links
};

app.post("/search1", async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).send("Missing searchText");
  }

  try {
    const links = await run(title);
    res.status(200).json({ links });
  } catch (error) {
    res.status(500).send(`Error during search: ${error.message}`);
  }
});

app.post("/search2", async (req, res) => {
  const query = req.body.title;

  if (!query) {
    return res.status(400).json({ error: "Title is required" });
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    // console.log(html);
    const $ = cheerio.load(html);
    // console.log($);

    const results = [];
    $("div.g").each((i, elem) => {
      // console.log(elem);
      if (i < 5) {
        // Limit to top 5 results
        const link = $(elem).find("a").attr("href");
        // console.log(title);
        console.log(link);

        if (link) {
          results.push(link);
        }
      }
    });

    res.json({ results });
  } catch (error) {
    console.error("Error fetching search results:", error);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
