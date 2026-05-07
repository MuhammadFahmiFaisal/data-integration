import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ==========================================
// Setup __dirname for ES Modules
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Define absolute paths for data sources
// ==========================================
const REINTEGRATED_PATH = path.join(__dirname, "../../data/json/reintegrated_data.json");
const OUTPUT_DIR = path.join(__dirname, "../../data/output");
const CLEANED_JSON_PATH = path.join(OUTPUT_DIR, "cleaned_data.json");
const CLEANED_CSV_PATH = path.join(OUTPUT_DIR, "cleaned_data.csv");

console.log("\n========================================================");
console.log("🧼 STARTING DATA CLEANING PIPELINE");
console.log("========================================================\n");

// ==========================================
// 1. Read Re-integrated Data
// ==========================================
let products = [];
try {
  console.log("⏳ [1/3] Membaca data hasil re-integrasi...");
  if (!fs.existsSync(REINTEGRATED_PATH)) {
    throw new Error(`File re-integrasi tidak ditemukan di: ${REINTEGRATED_PATH}`);
  }
  const content = fs.readFileSync(REINTEGRATED_PATH, "utf8");
  products = JSON.parse(content);
  console.log(`✅ Berhasil memuat ${products.length} produk.`);
} catch (err) {
  console.error("❌ Gagal membaca data re-integrasi:", err.message);
  process.exit(1);
}

// ==========================================
// Helper: Standardize Date to YYYY-MM-DD
// ==========================================
function standardizeDate(dateStr) {
  if (!dateStr) return "";
  dateStr = dateStr.trim();

  // Jika sudah format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Coba parse menggunakan JavaScript Date
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback regex parsing untuk DD/MM/YYYY atau MM/DD/YYYY atau format strip
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const part1 = match[1].padStart(2, "0");
    const part2 = match[2].padStart(2, "0");
    const yyyy = match[3];

    // Jika bagian pertama > 12, asumsikan format DD-MM-YYYY atau DD/MM/YYYY
    if (Number(part1) > 12) {
      return `${yyyy}-${part2}-${part1}`;
    }
    // Jika tidak, asumsikan format standar MM-DD-YYYY atau MM/DD/YYYY
    return `${yyyy}-${part1}-${part2}`;
  }

  return dateStr; // Fallback return mentah jika gagal parsing
}

// ==========================================
// 2. Perform Cleaning Process
// ==========================================
console.log("\n⏳ [2/3] Melakukan proses pembersihan data...");

let cleanedVendorCount = 0;
let cleanedDateCount = 0;

const cleanedProducts = products.map((prod) => {
  const item = { ...prod };
  let isModified = false;

  // ○ Isi nilai Vendor yang kosong dengan string "Unknown Vendor".
  if (!item.vendor || item.vendor.trim() === "") {
    item.vendor = "Unknown Vendor";
    cleanedVendorCount++;
    isModified = true;
  }

  // ○ Standarkan kembali semua format tanggal ke YYYY-MM-DD.
  const originalDate = item.date_added;
  const standardDate = standardizeDate(originalDate);
  if (originalDate !== standardDate) {
    item.date_added = standardDate;
    cleanedDateCount++;
    isModified = true;
  }

  return item;
});

// ==========================================
// Helper: Convert Array of Objects to CSV string
// ==========================================
function convertToCSV(array) {
  if (array.length === 0) return "";
  const headers = Object.keys(array[0]);
  const csvRows = [headers.join(",")];

  for (const row of array) {
    const values = headers.map((header) => {
      const val = row[header];
      if (typeof val === "string") {
        // Escape koma, tanda kutip ganda, dan baris baru
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }
      return val === null || val === undefined ? "" : val;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\r\n"); // Standard Windows line endings
}

// ==========================================
// 3. Save Output Data
// ==========================================
console.log("⏳ [3/3] Menyimpan data yang sudah dibersihkan...");
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Simpan dalam format JSON
  fs.writeFileSync(CLEANED_JSON_PATH, JSON.stringify(cleanedProducts, null, 2), "utf8");
  console.log(`✅ File JSON dibersihkan berhasil disimpan ke: ${CLEANED_JSON_PATH}`);

  // Simpan dalam format CSV (DataFrame/Table)
  const csvContent = convertToCSV(cleanedProducts);
  fs.writeFileSync(CLEANED_CSV_PATH, csvContent, "utf8");
  console.log(`✅ File CSV dibersihkan berhasil disimpan ke: ${CLEANED_CSV_PATH}`);
} catch (err) {
  console.error("❌ Gagal menyimpan data hasil pembersihan:", err.message);
  process.exit(1);
}

// ==========================================
// 4. Print Summary & Preview
// ==========================================
console.log("\n📊 SUMMARY PROSES DATA CLEANING:");
console.log("--------------------------------------------------------");
console.log(`Total Baris Diproses             : ${cleanedProducts.length}`);
console.log(`Jumlah Nilai Vendor yang Diisi   : ${cleanedVendorCount}`);
console.log(`Jumlah Tanggal yang Distandarkan : ${cleanedDateCount}`);
console.log("--------------------------------------------------------\n");

console.log("👀 PREVIEW 10 DATA HASIL CLEANING (Menunjukkan pengisian vendor & standardisasi tanggal):");
console.table(cleanedProducts.slice(0, 10));

console.log("\n========================================================");
console.log("🎉 PROSES DATA CLEANING SELESAI DENGAN SUKSES!");
console.log("========================================================\n");
