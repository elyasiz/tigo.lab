# TIGO LAB

Website katalog Montessori TIGO LAB dengan animasi 3D dan checkout QRIS Midtrans sandbox. Tampilan memakai HTML, CSS, dan JavaScript; dua Vercel Functions menangani pembayaran dan konfirmasi server.

## Fitur

- Sepuluh produk Montessori dengan gambar katalog TIGO LAB.
- Animasi cara bermain khusus untuk setiap produk, tersedia dari kartu, detail, dan produk unggulan. Video dimuat ketika diminta pengguna; kontrol putar/jeda tersedia dan video berhenti saat jendela ditutup.
- Pencarian, filter aktivitas, pengurutan harga, dan detail produk.
- Keranjang dengan perubahan jumlah dan penyimpanan lokal.
- QRIS dinamis sandbox dengan nominal yang dihitung server dari data produk bersama.
- Pesanan privat, pemulihan checkout setelah halaman ditutup, dan pemeriksaan status otomatis.
- Bukti pembayaran PDF otomatis setelah lunas terverifikasi, dengan logo dan font TIGO.
- Animasi pembuka, pergantian produk unggulan, interaksi kartu, dan efek tambah ke keranjang.
- Tampilan HP dan desktop, navigasi keyboard, serta dukungan pengurangan animasi.

## Identitas visual

Palet mengikuti referensi brand TIGO LAB: biru `#0088ff`, oranye `#ff5a2b`, kuning `#f8cd1a`, hijau `#22c55e`, pink `#ff6fae`, ungu `#8b5cf6`, cyan `#4dd0e1`, dan krem `#fff3e0`. Token warna ada di awal `dist/styles.css`; turunan biru dan oranye yang lebih gelap digunakan pada teks kecil dan tombol agar terbaca jelas.

Judul memakai Fredoka dan teks memakai Nunito, dipilih untuk mendekati gaya bulat pada referensi. Font disajikan lokal dari `dist/assets/fonts/` tanpa permintaan ke Google Fonts saat halaman dibuka. Lisensi SIL Open Font License masing-masing font disertakan di direktori yang sama. Logo dan foto produk tetap memakai aset katalog.

## Menjalankan secara lokal

Pasang dependensi dengan versi pnpm pada `package.json`, kemudian jalankan pratinjau:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Lalu buka `http://127.0.0.1:4180`. Tanpa konfigurasi server, checkout menampilkan bahwa akun sandbox belum terhubung. Untuk menguji seluruh alur secara lokal tanpa akun Midtrans, jalankan `node tools/dev-server.mjs --fixtures`. Mode ini memakai penyedia uji lokal dengan label jelas, bukan transaksi Midtrans, dan tidak dapat dijalankan di Vercel.

## Deploy ke Vercel

Proyek Vercel menggunakan framework Other, Node.js 24, `dist` sebagai direktori output, dan `main` sebagai production branch. Dependensi dipasang melalui Corepack/pnpm; tampilan tidak memerlukan proses build. Vercel membundel `api/payments.js` dan `api/midtrans.js` beserta aset PDF di `server/assets/`.

Konfigurasi yang diperlukan: `MIDTRANS_SERVER_KEY` khusus sandbox dan koneksi ke Blob Store **privat** yang mengisi `BLOB_READ_WRITE_TOKEN`. Tanpa keduanya, QRIS dinonaktifkan dengan pesan yang jelas; tidak ada pembayaran palsu atau fallback penyedia lokal di deployment. Lihat [panduan pembayaran sandbox](docs/payments-sandbox.md).

## Status sandbox

Harga jual per set mengikuti daftar harga 22 Oktober 2026 dan sudah termasuk kemasan. Seluruh tipe dalam satu produk digabung menjadi satu set lengkap, dengan kemasan dihitung sekali. Pilihan tipe lama di keranjang perlu ditinjau ulang sebelum checkout. Ongkir sandbox ditetapkan Rp0. Pengujian memakai simulator resmi Midtrans; jangan menggunakan aplikasi bank/e-wallet atau uang sungguhan. Tidak ada pengiriman barang. Data pesanan uji dan PDF disimpan privat di server ketika akun dan penyimpanan telah dihubungkan. Aktivasi produksi, stok, admin operasional, ongkir aktual, dan pengiriman email/WhatsApp berada di luar fitur sandbox ini.

Jalankan `pnpm test` untuk pengujian perhitungan nominal, idempotensi, pemalsuan notifikasi, pencocokan transaksi, pemulihan koneksi, dan akses PDF. `node tools/check-receipt.mjs` menghasilkan PDF pemeriksaan 10 produk set lengkap; gunakan `--stress` untuk nama/email panjang dan pagination. Pengujian lokal memakai kontrak Midtrans yang digantikan oleh penyedia uji; keberhasilannya tidak berarti koneksi ke akun Midtrans sudah diuji.

Gambar berasal dari katalog produk TIGO LAB yang disediakan untuk proyek ini.

## Animasi cara bermain

Metadata video, poster, dan tiga langkah setiap produk ada di `dist/demos.js`. Semua produk memiliki animasi dengan model 3D. Video MP4 H.264 tanpa audio ada di `dist/assets/videos/`. Model mengacu pada foto katalog dan memperagakan aktivitas; video bukan rekaman produk fisik dan model bukan pengukuran CAD.

Kesepuluh video dan poster aktif menggunakan logo TIGO LAB, judul Fredoka, petunjuk Nunito, panel krem, serta aksen biru, oranye, dan kuning. Kompositor membaca token warna langsung dari `dist/styles.css` dan font WOFF2 dari `dist/assets/fonts/`, sehingga identitas video mengikuti website. Aset aktif memakai akhiran `-3d-brand` agar browser yang pernah membuka video lama mengambil versi baru.

Sumber sembilan model Blender ada di `tools/demos3d/models.py`, dengan geometri berlubang, komponen terpisah, tali, pencahayaan, dan animasi tiap bagian. `tools/demos3d/engine.py` berisi fungsi geometri dan rendering bersama. Spinning Shapes Stacker memakai gerakan mesh aslinya dalam `tools/demos3d/stacker_stage.py`, lalu diberi tampilan yang sama melalui kompositor. Nama produk dan langkah bermain disimpan di `tools/demos3d/products.json`.

Untuk membuat ulang, gunakan Blender 4.5 LTS untuk rendering dan Python dengan Pillow serta FFmpeg (atau paket `imageio-ffmpeg`) untuk ekspor:

```sh
blender --background --python tools/render_3d_demos.py -- --all
python tools/compose_3d_demos.py --all
```

Rendering Blender disimpan di `tmp/render3d/`, yang diabaikan Git. Sesudah rangkaian frame lengkap tersedia, jalankan `python tools/compose_3d_demos.py --preview` untuk memeriksa tampilan dan `python tools/compose_3d_demos.py --all` untuk memperbarui warna, font, dan poster. Perubahan tampilan video dapat memakai kembali frame yang sudah dirender. Gunakan `--product M01` untuk satu produk atau `--product M09` untuk Stacker. Pillow perlu mendukung font WOFF2 dan variable font; renderer Stacker juga memakai NumPy. Path FFmpeg dapat diberikan melalui `FFMPEG_BIN`, dan direktori berisi dua font WOFF2 melalui `TIGO_FONT_DIR`. Vercel tetap menyajikan file statis tanpa menjalankan Blender.

Berkas video lama tetap tersedia untuk kompatibilitas halaman yang sudah terbuka. Metadata aktif menunjuk ke versi 3D dengan branding terbaru.

## Video tambahan dekat footer

Bagian `#cerita-bermain` menampilkan dua video yang diberikan pemilik proyek: eksplorasi sensori dengan corong dan eksplorasi energi dengan roda/lampu. Keduanya berada dalam slider di atas footer, terpisah dari katalog produk. Navigasi mendukung tombol, indikator, keyboard pada area slide, dan geser horizontal di ponsel.

Aset di `dist/assets/stories/` memakai MP4 H.264 1280×720 dengan audio asli AAC dan fast start. Poster WebP diambil dari videonya. File MP4 memakai `preload="none"`; video aktif mencoba autoplay bersuara saat area slider terlihat. Jika browser menolak autoplay bersuara, video tetap berjalan tanpa suara, kemudian mencoba menyalakan audio pada klik/tap atau Enter/Spasi pengunjung berikutnya. Interaksi dengan kontrol native video tetap mengikuti pilihan pengunjung. Tidak ada perubahan izin browser. Event `ended` memindahkan ke video berikutnya, lalu mengulang dari video pertama. Pilihan mute dan volume mengikuti kedua slide.

Label nomor/durasi video dan tombol Jeda/Putar otomatis dihapus; kontrol play, pause, dan volume bawaan video tetap tersedia. Jeda manual menghentikan putaran otomatis. Video juga berhenti saat keluar dari layar, tab disembunyikan, atau video lain diputar; pemutaran yang masih diaktifkan dapat dilanjutkan saat area video terlihat kembali. Preferensi pengurangan gerak menonaktifkan autoplay sampai pengunjung menekan play sendiri. `dist/stories.js` menangani navigasi dan aksesibilitas; warna serta font mengikuti token website.
