import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "url";

// ==========================================
// Setup __dirname for ES Modules
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Define absolute paths for data sources
// ==========================================
const DB_PATH = path.join(__dirname, "../../db/products.db");
const JSON_PATH = path.join(__dirname, "../../data/json/operational_data.json");
const XML_PATH = path.join(__dirname, "../../data/xml/products.xml");
const OUTPUT_DIR = path.join(__dirname, "../../data/json");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "reintegrated_data.json");

console.log("\n========================================================");
console.log("🔄 STARTING RE-INTEGRATION PIPELINE");
console.log("========================================================\n");

// ==========================================
// 1. Read SQLite Database
// ==========================================
let sqlProducts = [];
try {
  console.log("⏳ [1/3] Membaca data dari SQLite Database...");
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database SQLite tidak ditemukan di: ${DB_PATH}`);
  }
  const db = new DatabaseSync(DB_PATH);
  const stmt = db.prepare("SELECT id, product_name, price FROM products");
  sqlProducts = stmt.all();
  db.close();
  console.log(`✅ Berhasil memuat ${sqlProducts.length} produk dari SQLite.`);
} catch (err) {
  console.error("❌ Gagal membaca dari SQLite database:", err.message);
  process.exit(1);
}

// ==========================================
// 2. Read JSON File
// ==========================================
let jsonProducts = [];
try {
  console.log("⏳ [2/3] Membaca data dari JSON File...");
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`File JSON tidak ditemukan di: ${JSON_PATH}`);
  }
  const jsonContent = fs.readFileSync(JSON_PATH, "utf8");
  jsonProducts = JSON.parse(jsonContent);
  console.log(`✅ Berhasil memuat ${jsonProducts.length} produk dari JSON.`);
} catch (err) {
  console.error("❌ Gagal membaca dari file JSON:", err.message);
  process.exit(1);
}

// ==========================================
// 3. Read XML File
// ==========================================
let xmlProducts = [];
try {
  console.log("⏳ [3/3] Membaca data dari XML File...");
  if (!fs.existsSync(XML_PATH)) {
    throw new Error(`File XML tidak ditemukan di: ${XML_PATH}`);
  }
  const xmlContent = fs.readFileSync(XML_PATH, "utf8");
  
  // Custom parsing XML menggunakan regex
  const productBlocks = xmlContent.match(/<product>[\s\S]*?<\/product>/g) || [];
  xmlProducts = productBlocks.map((block) => {
    const idMatch = block.match(/<id>(.*?)<\/id>/);
    const vendorMatch = block.match(/<vendor>(.*?)<\/vendor>/);
    const dateAddedMatch = block.match(/<date_added>(.*?)<\/date_added>/);
    
    return {
      id: idMatch ? Number(idMatch[1].trim()) : null,
      vendor: vendorMatch ? vendorMatch[1].trim() : "",
      date_added: dateAddedMatch ? dateAddedMatch[1].trim() : ""
    };
  });
  console.log(`✅ Berhasil memuat ${xmlProducts.length} produk dari XML.`);
} catch (err) {
  console.error("❌ Gagal membaca dari file XML:", err.message);
  process.exit(1);
}

// ==========================================
// 4. Merge Data (Re-integration)
// ==========================================
console.log("\n🔄 Menyatukan ketiga sumber data...");

// Buat map/dictionary menggunakan id sebagai key untuk mempercepat pencarian (O(N) complexity)
const sqlMap = new Map(sqlProducts.map((p) => [Number(p.id), p]));
const jsonMap = new Map(jsonProducts.map((p) => [Number(p.id), p]));
const xmlMap = new Map(xmlProducts.map((p) => [Number(p.id), p]));

// Kumpulkan semua id unik
const allIds = Array.from(
  new Set([...sqlMap.keys(), ...jsonMap.keys(), ...xmlMap.keys()])
).sort((a, b) => a - b);

const reintegratedProducts = allIds.map((id) => {
  const sqlData = sqlMap.get(id) || {};
  const jsonData = jsonMap.get(id) || {};
  const xmlData = xmlMap.get(id) || {};

  // Catatan:
  // - product_name dan price diambil dari SQLite (Part 1)
  // - stock diambil dari JSON (Part 2)
  // - vendor diambil dari XML karena memiliki 5 data kosong (Part 3) untuk nantinya dibersihkan di Part 5
  // - date_added diambil dari XML karena formatnya masih mentah/belum terstandardisasi untuk dibersihkan di Part 5
  return {
    id: id,
    product_name: sqlData.product_name || "Unknown Product",
    price: sqlData.price !== undefined ? sqlData.price : 0,
    stock: jsonData.stock !== undefined ? jsonData.stock : 0,
    vendor: xmlData.vendor !== undefined ? xmlData.vendor : "",
    date_added: xmlData.date_added !== undefined ? xmlData.date_added : ""
  };
});

// Hitung statistik vendor kosong
const emptyVendorCount = reintegratedProducts.filter((p) => p.vendor === "").length;

// ==========================================
// 5. Save Reintegrated Data
// ==========================================
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(reintegratedProducts, null, 2), "utf8");
  console.log(`\n💾 Hasil re-integrasi disimpan ke: ${OUTPUT_PATH}`);
} catch (err) {
  console.error("❌ Gagal menyimpan hasil re-integrasi:", err.message);
  process.exit(1);
}

// ==========================================
// 6. Print Summary & Preview
// ==========================================
console.log("\n📊 SUMMARY PIPELINE RE-INTEGRASI:");
console.log("--------------------------------------------------------");
console.log(`Total ID Unik Terdeteksi     : ${allIds.length}`);
console.log(`Total Data Hasil Re-integrasi: ${reintegratedProducts.length}`);
console.log(`Vendor Kosong Terdeteksi     : ${emptyVendorCount} (Akan dibersihkan pada tahap selanjutnya)`);
console.log("--------------------------------------------------------\n");

console.log("👀 PREVIEW 10 DATA PERTAMA:");
console.table(reintegratedProducts.slice(0, 10));

console.log("\n========================================================");
console.log("🎉 RE-INTEGRASI SELESAI DENGAN SUKSES!");
console.log("========================================================\n");
