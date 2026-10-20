# TIGO LAB

Website katalog Montessori TIGO LAB dengan animasi dan simulasi belanja. Dibuat dengan HTML, CSS, dan JavaScript tanpa proses build.

## Fitur

- Sepuluh produk Montessori dengan gambar katalog TIGO LAB.
- Animasi cara bermain khusus untuk setiap produk, tersedia dari kartu, detail, dan produk unggulan. Video dimuat ketika diminta pengguna; kontrol putar/jeda tersedia dan video berhenti saat jendela ditutup.
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

## Animasi cara bermain

Metadata video, poster, dan tiga langkah setiap produk ada di `dist/demos.js`. Video MP4 H.264 tanpa audio ada di `dist/assets/videos/`. Ilustrasi memperagakan aktivitas berdasarkan foto katalog; bukan rekaman produk fisik. Video Spinning Shapes Stacker memakai model 3D sederhana yang telah dibuat sebelumnya.

Sumber sembilan animasi tambahan ada di `tools/render_product_demos.py`. Untuk membuat ulang, gunakan Python dengan Pillow dan FFmpeg (atau paket `imageio-ffmpeg`):

```sh
python tools/render_product_demos.py --all
```

Gunakan `--preview` untuk membuat lembar pemeriksaan visual, atau `--product M01` untuk membuat ulang satu produk. Path FFmpeg dapat diberikan melalui variabel `FFMPEG_BIN`, dan direktori font melalui `TIGO_FONT_DIR`.
