import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";

// =========================
// FIX __dirname
// =========================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = [];

// =========================
// PATH CSV
// =========================

const csvPath = path.join(
  __dirname,
  "../../data/raw/master_data.csv"
);

// =========================
// READ CSV
// =========================

fs.createReadStream(csvPath)
  .pipe(csv())

  .on("data", (data) => {
    results.push(data);
  })

  .on("end", () => {

    // =========================
    // KOSONGKAN 5 VENDOR
    // =========================

    for (let i = 0; i < 5; i++) {
      results[i].vendor = "";
    }

    // =========================
    // BUILD XML
    // =========================

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<products>\n`;

    results.forEach((item) => {

        const productId = item.id || item["﻿id"];

        xml += `  <product>\n`;
        xml += `    <id>${productId}</id>\n`;
        xml += `    <vendor>${item.vendor}</vendor>\n`;
        xml += `    <date_added>${item.date_added}</date_added>\n`;
        xml += `  </product>\n`;

    });

    xml += `</products>`;

    // =========================
    // OUTPUT DIRECTORY
    // =========================

    const outputDir = path.join(
      __dirname,
      "../../data/xml"
    );

    // buat folder jika belum ada
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
      outputDir,
      "products.xml"
    );

    // =========================
    // SAVE XML
    // =========================

    fs.writeFileSync(outputPath, xml);

    console.log("products.xml berhasil dibuat!");
  });