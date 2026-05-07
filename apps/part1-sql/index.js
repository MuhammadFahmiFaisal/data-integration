import fs from "fs"
import path from "path"
import csv from "csv-parser"
import { DatabaseSync } from "node:sqlite"

// =======================
// PATH SETUP
// =======================
const CSV_PATH = path.resolve("./data/raw/master_data.csv")
const DB_DIR = path.resolve("./db")
const DB_PATH = path.join(DB_DIR, "products.db")

// =======================
// ENSURE DB FOLDER
// =======================
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

// =======================
// INIT DATABASE
// =======================
const db = new DatabaseSync(DB_PATH)

// =======================
// CREATE TABLE
// =======================
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    product_name TEXT,
    price INTEGER
  )
`)

console.log("✅ SQLite (Node 24) ready:", DB_PATH)

// =======================
// INSERT FUNCTION
// =======================
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO products (id, product_name, price)
  VALUES (?, ?, ?)
`)

// =======================
// READ CSV & INSERT
// =======================
let count = 0

fs.createReadStream(CSV_PATH)
  .pipe(csv())
  .on("data", (row) => {
    try {
      const productId = row.id || row["\ufeffid"] || row["﻿id"];
      insertStmt.run(
        Number(productId),
        row.product_name,
        Number(row.price)
      )
      count++
    } catch (err) {
      console.error("❌ Insert error:", err.message)
    }
  })
  .on("end", () => {
    console.log(`✅ Insert selesai. Total data: ${count}`)
    db.close()
  })
  .on("error", (err) => {
    console.error("❌ CSV error:", err.message)
  })