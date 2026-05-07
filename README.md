# 🧩 Data Integration Pipeline (Node.js + pnpm + SQLite)

## 📌 Overview

Project ini merupakan implementasi pipeline data berdasarkan studi kasus di tugas Integrasi & Migrasi Sistem pertemuan-6:

* Input: `master_data.csv`
* Output: data terstruktur melalui beberapa tahap:

  * Part 1: SQLite
  * Part 2: JSON
  * Part 3: XML
  * Re-integrate
  * Data Cleaning

---

## 🏗️ Project Structure

```
data-integration/
│
├── apps/
│   ├── part1-sql/
│   ├── part2-json/
│   ├── part3-xml/
│   ├── re-integrate/
│   └── data-cleaning/
│
├── data/
│   ├── raw/
│   │   └── master_data.csv
│   └── output/ #output hasil data cleaning masuk sini
│
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## ⚙️ Tech Stack

* Node.js (v24)
* pnpm (workspace monorepo)
* Built-in SQLite (`node:sqlite`)
* csv-parser
* bisa aja nambah--

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repo-url>
cd data-integration
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Data Pipeline Steps

Jalankan setiap tahap pipeline data secara berurutan menggunakan perintah berikut:

```bash
# Part 1: SQL Ingestion (SQLite)
pnpm start1

# Part 2: JSON Conversion
pnpm start2

# Part 3: XML Export
pnpm start3

# Part 4: Re-integration
pnpm start4

# Part 5: Data Cleaning (Final Output)
pnpm start5
```


## 📂 Data Mentah

Lokasi file:

```
data/raw/master_data.csv
```

Kolom:

* id
* product_name
* price
* stock
* vendor
* date_added

---

## 🧠 Part 1 – SQL (SQLite)

### 🎯 Objective

Menyimpan 3 kolom utama ke database:

* id
* product_name
* price

---

### ⚙️ Workflow

```
CSV → Read Stream → Transform → Insert → SQLite
```

---

### 📄 Penjelasan File

#### `apps/part1-sql/index.js`

| Section      | Fungsi                     |
| ------------ | -------------------------- |
| Path Setup   | Menentukan lokasi CSV & DB |
| Init DB      | Membuat database SQLite    |
| Create Table | Membuat tabel `products`   |
| Read CSV     | Streaming data             |
| Insert       | Simpan ke database         |

---

### 🗄️ Output

File database:

```
apps/part1-sql/db/products.db
```

---

## ⚠️ Catatan Penting

* Menggunakan `node:sqlite` untuk menghindari error native binding
* CSV tidak diubah (raw data tetap immutable)
* Insert menggunakan `INSERT OR REPLACE`

---

## 🧠 Part 2 – JSON

### 🎯 Objective

Menyimpan 3 kolom operasional (ditambah `id` untuk relasi) ke format JSON, serta mengubah format tanggal menjadi `MM DD YYYY`:

* id
* stock
* vendor
* date_added (format diubah ke `MM DD YYYY`)

---

### ⚙️ Workflow

```text
CSV → Read Stream → Transform (Date Format) → Push to Array → Write JSON
```

---

### 📄 Penjelasan File

#### `apps/part2-json/index.js`

| Section              | Fungsi                                       |
| -------------------- | -------------------------------------------- |
| Path Setup           | Menentukan lokasi CSV & folder JSON          |
| Ensure JSON Folder   | Membuat folder `data/json/` jika belum ada   |
| Process & Parse Data | Parsing CSV dan mengubah format tanggal      |
| Write JSON           | Menyimpan array data ke dalam file `.json`   |

---

### 🗄️ Output

File JSON:

```
data/json/operational_data.json
```

---

## 🧠 Part 3 – XML

### 🎯 Objective

Menyimpan sisa data relasional operasional ke format XML, serta mengosongkan 5 nilai vendor awal untuk keperluan pengujian pembersihan data (data cleaning) di tahap berikutnya:

* id
* vendor (dikosongkan untuk 5 record pertama)
* date_added (format mentah dari CSV)

---

### ⚙️ Workflow

```text
CSV → Read Stream → Empty First 5 Vendors → Build XML → Write XML File
```

---

### 📄 Penjelasan File

#### `apps/part3-xml/index.js`

| Section             | Fungsi                                              |
| ------------------- | --------------------------------------------------- |
| Path Setup          | Menentukan lokasi CSV & folder XML                  |
| Read CSV            | Parsing CSV data menggunakan `csv-parser`           |
| Empty Vendors       | Mengosongkan nilai `vendor` untuk 5 baris pertama   |
| Build XML           | Membuat struktur XML `<products>` dan `<product>`   |
| Save XML            | Menyimpan string XML hasil build ke file `.xml`     |

---

### 🗄️ Output

File XML:

```
data/xml/products.xml
```

---

## 🧠 Part 4 – Re-integrate

### 🎯 Objective

Membaca ketiga sumber data yang terdistribusi (SQLite, JSON, dan XML) dan menyatukannya kembali (join/merge) berdasarkan kolom `id` menjadi satu tabel utuh yang merepresentasikan data asli sebelum transformasi:

* `id`
* `product_name` (dari SQLite)
* `price` (dari SQLite)
* `stock` (dari JSON)
* `vendor` (dari XML - memiliki 5 nilai kosong)
* `date_added` (dari XML - format tanggal mentah)

---

### ⚙️ Workflow

```text
SQLite (DB) ──┐
JSON (File) ──┼─→ Read & Join (Map O(N)) ──→ Reintegrated JSON File
XML (File)  ──┘
```

---

### 📄 Penjelasan File

#### `apps/re-integrate/index.js`

| Section                  | Fungsi                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| Path Setup               | Menentukan lokasi DB, file JSON, file XML, dan folder output              |
| Load SQLite Data         | Membaca data dari tabel `products` SQLite database                        |
| Load JSON Data           | Membaca data operasional dari file JSON                                   |
| Load XML Data            | Melakukan parsing data dari file XML menggunakan custom Regex parser      |
| Join & Merge             | Menggunakan data struktur `Map` berbasis `id` untuk menggabungkan data    |
| Write Reintegrated Data  | Menyimpan data hasil penggabungan ke file JSON                            |

---

### 🗄️ Output

File Reintegrated JSON:

```
data/json/reintegrated_data.json
```

---

## 🧠 Part 5 – Data Cleaning

### 🎯 Objective

Melakukan pembersihan data pada hasil re-integrasi dengan memenuhi aturan bisnis berikut:

* Mengisi nilai `vendor` yang kosong dengan string `"Unknown Vendor"`.
* Menstandardisasikan format kolom `date_added` menjadi format internasional baku (`YYYY-MM-DD`).

---

### ⚙️ Workflow

```text
Reintegrated Data → Fill Empty Vendors → Standardize Dates → Save Clean JSON & CSV
```

---

### 📄 Penjelasan File

#### `apps/data-cleaning/index.js`

| Section                | Fungsi                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| Path Setup             | Menentukan lokasi file reintegrated dan folder output final               |
| Load Reintegrated Data | Membaca data hasil penggabungan                                           |
| Clean Vendor           | Mendeteksi string vendor yang kosong dan menggantinya dengan `"Unknown Vendor"` |
| Standardize Date       | Melakukan parsing berbagai format tanggal dan mengubahnya ke `YYYY-MM-DD` |
| Save JSON & CSV        | Menyimpan dataset bersih ke dalam format `.json` dan `.csv` (tabular)     |

---

### 🗄️ Output

File Bersih Hasil Pembersihan Data:

```
data/output/cleaned_data.json
data/output/cleaned_data.csv
```

---

## 🤝 Contribution (Fork & PR)

### Step:

1. Fork repository ini

2. Clone fork kamu

3. Buat branch baru:

   ```bash
   git checkout -b feature/part2-json
   ```

4. Implement feature

5. Commit:

   ```bash
   git commit -m "Add Part 2 JSON transformation"
   ```

6. Push:

   ```bash
   git push origin feature/part2-json
   ```

7. Buat Pull Request

---

## 🧠 Design Principles

* Modular architecture (per part)
* Separation of concern
* Reusable packages
* Data pipeline approach

---
