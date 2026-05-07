import fs from "fs"
import path from "path"
import csv from "csv-parser"

// =======================
// PATH SETUP
// =======================
const CSV_PATH = path.resolve("./data/raw/master_data.csv")
const JSON_DIR = path.resolve("./data/json")
const JSON_PATH = path.join(JSON_DIR, "operational_data.json")

// =======================
// ENSURE JSON FOLDER
// =======================
if (!fs.existsSync(JSON_DIR)) {
  fs.mkdirSync(JSON_DIR, { recursive: true })
}

// =======================
// PROCESS & PARSE DATA
// =======================
const results = []

fs.createReadStream(CSV_PATH)
  .pipe(csv())
  .on("data", (row) => {
    try {
      // 1. Parsing tanggal asli yang formatnya bermacam-macam di CSV
      const dateObj = new Date(row.date_added)
      
      // 2. Mengubah format tanggal menjadi MM DD YYYY
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getDate()).padStart(2, '0')
      const yyyy = dateObj.getFullYear()
      const formattedDate = `${mm} ${dd} ${yyyy}`

      const productId = row.id || row["\ufeffid"] || row["﻿id"];

      // 3. Menyimpan data operasional
      // (simpan id untuk relasi, beserta 3 kolom operasional: stock, vendor, date_added)
      results.push({
        id: Number(productId),
        stock: Number(row.stock),
        vendor: row.vendor || "Unknown",
        date_added: formattedDate // Sengaja diubah ke format MM DD YYYY
      })
    } catch (err) {
      const productId = row.id || row["\ufeffid"] || row["﻿id"];
      console.error(`❌ Error parsing row id ${productId}:`, err.message)
    }
  })
  .on("end", () => {
    // 4. Menyimpan array ke dalam file JSON
    fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2), "utf8")
    console.log(`✅ Konversi JSON selesai! Total data: ${results.length}`)
    console.log(`📂 File tersimpan di: ${JSON_PATH}`)
  })
  .on("error", (err) => {
    console.error("❌ CSV error:", err.message)
  })
