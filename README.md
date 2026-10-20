# TIGO LAB

Website katalog Montessori TIGO LAB dengan animasi dan simulasi belanja. Dibuat dengan HTML, CSS, dan JavaScript tanpa proses build.

## Fitur

- Sepuluh produk Montessori dengan gambar katalog TIGO LAB.
- Pencarian, filter aktivitas, pengurutan harga, dan detail produk.
- Keranjang dengan perubahan jumlah dan penyimpanan lokal.
- Simulasi checkout dan unduhan ringkasan demo.
- Animasi pembuka, pergantian produk unggulan, interaksi kartu, dan efek tambah ke keranjang.
- Tampilan HP dan desktop, navigasi keyboard, serta dukungan pengurangan animasi.

## Menjalankan secara lokal

Jalankan server HTTP statis dengan `dist` sebagai direktori root. Contoh jika Python tersedia:

```sh
python -m http.server 4173 --directory dist
```

Lalu buka `http://localhost:4173`.

## Deploy ke Vercel

Import repositori ini di Vercel. Konfigurasi `vercel.json` menentukan framework Other, tanpa instalasi atau build, dengan `dist` sebagai direktori output. Production branch menggunakan `main`.

## Status demo

Semua harga merupakan contoh. Checkout hanya menyimpan ringkasan pada browser pengguna dan tidak mengirim pesanan atau menerima pembayaran. Akun pelanggan nyata, admin, ongkir aktual, serta pembayaran belum diaktifkan. Detail bahan dan isi paket final perlu dikonfirmasi sebelum penjualan.

Gambar berasal dari katalog produk TIGO LAB yang disediakan untuk proyek ini.
