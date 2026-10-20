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

## Identitas visual

Palet mengikuti referensi brand TIGO LAB: biru `#0088ff`, oranye `#ff5a2b`, kuning `#f8cd1a`, hijau `#22c55e`, pink `#ff6fae`, ungu `#8b5cf6`, cyan `#4dd0e1`, dan krem `#fff3e0`. Token warna ada di awal `dist/styles.css`; turunan biru dan oranye yang lebih gelap digunakan pada teks kecil dan tombol agar terbaca jelas.

Judul memakai Fredoka dan teks memakai Nunito, dipilih untuk mendekati gaya bulat pada referensi. Font disajikan lokal dari `dist/assets/fonts/` tanpa permintaan ke Google Fonts saat halaman dibuka. Lisensi SIL Open Font License masing-masing font disertakan di direktori yang sama. Logo dan foto produk tetap memakai aset katalog.

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

Metadata video, poster, dan tiga langkah setiap produk ada di `dist/demos.js`. Semua produk memiliki animasi dengan model 3D. Video MP4 H.264 tanpa audio ada di `dist/assets/videos/`. Model mengacu pada foto katalog dan memperagakan aktivitas; video bukan rekaman produk fisik dan model bukan pengukuran CAD. Spinning Shapes Stacker mempertahankan animasi 3D yang sudah ada.

Sumber sembilan model lainnya ada di `tools/demos3d/models.py`, dengan geometri berlubang, komponen terpisah, tali, pencahayaan, dan animasi tiap bagian. `tools/demos3d/engine.py` berisi fungsi geometri dan rendering bersama. Nama produk dan langkah bermain disimpan di `tools/demos3d/products.json`.

Untuk membuat ulang, gunakan Blender 4.5 LTS untuk rendering dan Python dengan Pillow serta FFmpeg (atau paket `imageio-ffmpeg`) untuk ekspor:

```sh
blender --background --python tools/render_3d_demos.py -- --all
python tools/compose_3d_demos.py --all
```

Rendering disimpan di `tmp/render3d/`, yang diabaikan Git. Untuk pemeriksaan visual sebelum ekspor, jalankan Blender dengan `-- --preview --frame 212`, lalu `python tools/compose_3d_demos.py --preview`. Gunakan `--product M01` pada kedua perintah untuk satu produk. Path FFmpeg dapat diberikan melalui `FFMPEG_BIN`, dan direktori font melalui `TIGO_FONT_DIR`. Vercel tetap menyajikan file statis tanpa menjalankan Blender.

Berkas video 2D lama tetap tersedia untuk kompatibilitas halaman yang sudah terbuka. Metadata aktif menunjuk ke versi 3D.
