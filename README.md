# TIGO LAB

Website katalog Montessori TIGO LAB dengan animasi 3D dan checkout QRIS Midtrans sandbox. Tampilan memakai HTML, CSS, dan JavaScript; dua Vercel Functions menangani pembayaran dan konfirmasi server.

## Fitur

- Menu Coding pada navigasi desktop dan HP di kedua koleksi, dengan halaman `coding.html` untuk Code Tiles, foto katalog kotak berlatar putih, empat panduan bermain SVG statis, ide kegiatan kelas, dan formulir pertanyaan sekolah/rumah. Formulir memvalidasi kebutuhan lalu membuat ringkasan yang disalin pengunjung; belum ada pengiriman, endpoint baru, penyimpanan data pribadi, harga, atau checkout Code Tiles. Nomor kontak bisnis belum ditentukan. Video ditambahkan saat tersedia. Formulir dan menu dilayani `coding.js`; gaya lokal memakai font dan palet merek yang sama. Ilustrasi dapat dibuat ulang dengan `node tools/create-coding-guide.mjs`.
- Sebelas produk Montessori dengan gambar katalog TIGO LAB; sepuluh set memiliki harga terkonfirmasi.
- Sebelas produk Montessori memiliki animasi cara bermain, tersedia dari kartu, detail, dan produk unggulan. Video dimuat ketika diminta pengguna; kontrol putar/jeda tersedia dan video berhenti saat jendela ditutup.
- Pencarian, filter aktivitas, pengurutan harga, dan detail produk.
- Keranjang dengan perubahan jumlah dan penyimpanan lokal.
- QRIS dinamis sandbox dengan nominal yang dihitung server dari data produk bersama.
- Pesanan privat, pemulihan checkout setelah halaman ditutup, dan pemeriksaan status otomatis.
- Bukti pembayaran PDF otomatis setelah lunas terverifikasi, dengan logo dan font TIGO.
- Animasi pembuka, pergantian produk unggulan, interaksi kartu, dan efek tambah ke keranjang.
- Tampilan HP dan desktop, navigasi keyboard, serta dukungan pengurangan animasi.

## Identitas visual

Geometric Bead Threading (`M02`) dan Hair Beading Activity (`M07`) memakai contoh warna merah (`#c9403d`), kuning (`#e9b938`), dan biru (`#2f66b0`) yang disetujui pengguna. Foto baru adalah `assets/beads-primary.webp` dan `assets/hair-beading-primary.webp`; tali Geometric tetap krem, wajah Hair Beading tetap natural, dan tali serta wadahnya tetap putih. Katalog, detail, hero dan keranjang membaca aset dari data produk bersama. Video/poster `beads-primary-3d-play` dan `hair-beading-primary-3d-play` memakai warna manik yang sama, dengan gerakan, bentuk dan petunjuk bermain sebelumnya dipertahankan. Model Hair Beading menampilkan enam kompartemen dalam dua baris merah–kuning–biru serta pola warna pada tali. Aset awal tetap tersedia; harga dan produk lainnya tidak diubah.

Sensory Funnel Play (`M03`) memakai varian warna yang disetujui pengguna: rangka warna kayu terang (`#cfa979`) dan corong, wadah, mangkuk, serta sendok hijau daun (`#4e7d3a`). Foto `assets/funnel-wood-leaf.webp` berasal dari contoh hasil imagegen yang disetujui, dengan konstruksi plastik dan bentuk produk dipertahankan. Katalog, detail, produk unggulan, dan foto pada bagian tentang memakai varian yang sama. Model `funnel()` dan video/poster `funnel-wood-leaf-3d-play` menggunakan palet tersebut tanpa mengubah gerakan atau petunjuk bermain. Aset lama disimpan untuk kompatibilitas; rekaman tambahan yang diunggah pengguna tetap merupakan video aslinya. Harga dan isi teks produk tidak berubah.

Fraction (`M11`) memakai gambar `assets/fraction-red-green-wood.webp` dari contoh yang disetujui: 36 kepingan merah dengan label putih, papan hijau dan bingkai warna wood terang. Foto awal `assets/fraction.webp` disimpan. Video 3D 12 detik `fraction-red-green-3d-play` memperagakan mengangkat dua kepingan setengah dan satu seperempat, membandingkan bagiannya, lalu mengembalikannya ke lingkaran utuh. Model `tools/demos3d/fraction.py` memuat delapan kelompok pecahan 1/1 hingga 1/8 dengan angka dan jumlah kepingan yang ditentukan dalam geometri. Detail juga mempertahankan tiga petunjuk bermain tertulis. Harga, kode penjualan, bahan, dimensi, dan spesifikasi paket belum dikonfirmasi; harga ditampilkan sebagai “Harga akan diinformasikan.” tanpa tombol keranjang. `offers` hanya memuat produk dengan harga sah, sehingga Fraction ditolak oleh pemulihan keranjang dan checkout server sampai harganya ditetapkan. Sepuluh harga sebelumnya tidak berubah.

Spinning Shapes Stacker (`M09`) memakai `assets/stacker-primary-wood.webp`: kotak merah, segi enam kuning dan lingkaran biru, dengan alas serta tiga tiang berulir warna wood terang. Video/poster `stacker-primary-wood-3d-play` mempertahankan gerakan putar dan turun dengan palet yang sama; foto hero, katalog, detail dan keranjang memakai aset baru. Warna wood tetap merepresentasikan plastik berwarna kayu. Build-a-Train Play dan Shoe Lacing Trainer, termasuk video dan harganya, tidak diubah.

Menu **English Course** membuka `dist/english-course.html` (URL Vercel `/english-course`). Halaman memakai stylesheet brand bersama dan file `english-course.css`/`english-course.js` untuk tata letak, menu HP, preferensi gerak, detail Emotion Slider, serta ide aktivitas. Katalog menampilkan Emotion Slider, CVC Word, dan Confident Wheel, dengan tombol pembesaran/detail serta ide aktivitas. Nama Confident Wheel mengikuti penamaan pengguna. CVC Word memakai `assets/english-cvc-word-cat.webp`, visual katalog transparan 1254×1254 yang disunting dengan imagegen berdasarkan PNG pengguna: kartu kucing bertuliskan cat dan tiga huruf c biru, a merah, t biru. PNG sumber tetap tersedia tanpa perubahan. Confident Wheel memakai `assets/english-confident-wheel-front.webp`, visual katalog transparan 1254×1254 yang disunting dengan imagegen berdasarkan PNG pengguna agar menghadap depan dengan judul tegak. Warna oranye, tepi biru, poros kuning, dua jendela, dan identitas Smart Reader menjadi referensi produk; gambar merupakan visual hasil penyuntingan, bukan foto dokumentasi baru. Kartu dan dialog detail memakai aset yang sama; PNG sumber tetap tersedia tanpa perubahan. Harga, usia rekomendasi, bahan, dimensi, dan isi paket belum diberikan; halaman tidak mengarang spesifikasi atau menambahkan produk ke checkout. Katalog serta harga Montessori tetap memakai `products.js`.

Video pengguna **TIGOLAB SMARTREADER.mov** ditampilkan pada bagian `#video-english-course` dekat footer English Course. Versi web `assets/stories/english-course-tigo-smartreader.mp4` memakai H.264 720×1280, 30 fps, yuv420p, dan fast start. Audio AAC asli disalin tanpa enkode ulang; isi video tidak dipotong. Sampul WebP berasal dari detik ke-10. Pemutaran dimulai melalui kontrol native dengan audio aktif; video tidak diputar otomatis dan dimuat dengan `preload="none"`. Video berhenti saat keluar dari layar, tab disembunyikan, atau dialog produk dibuka; hanya satu video pada halaman yang dapat diputar pada satu waktu. MOV sumber tidak dipublikasikan.

Emotion Slider memiliki video cara bermain 3D 12 detik di `assets/videos/emotion-slider-3d-brand.mp4`, dapat dibuka dari halaman dan detail produk. Video dimuat setelah diminta, berhenti saat dialog ditutup atau tab disembunyikan, dan membuka poster tanpa autoplay saat preferensi pengurangan gerak aktif. Kontrol video dan tautan alternatif tetap tersedia. Metadata animasi ada di `dist/demos.js` dengan ID `E01`, terpisah dari sebelas produk Montessori.

Model Blender ada di `tools/demos3d/emotion_slider.py`: alas oranye dengan bingkai krem, kanal nyata, serta lima cakram berwajah yang bergerak satu per satu mengikuti rel. Pemeriksaan posisi 288 frame memastikan urutan cakram tetap, tidak saling menembus, dan tetap di dalam kanal. Keterangan contoh percakapan dan penanda ekspresi ditambahkan saat komposisi, mengikuti font dan token warna situs. Untuk membuat ulang, jalankan `blender -b --python tools/render_3d_demos.py -- --product E01`, lalu `python tools/compose_3d_demos.py --product E01`. `motion.json` di folder render menyimpan proyeksi penanda; tidak dipublikasikan.

Gambar `emotion-slider-catalog.webp` merupakan visual katalog yang dirapikan dengan imagegen berdasarkan foto Emotion Slider yang disediakan pengguna: satu alas oranye dengan jalur krem serta lima wajah kuning, biru, merah, ungu, dan hijau. Referensi gaya adalah foto katalog TIGO LAB yang sudah ada. Foto sumber tidak dipublikasikan. File PNG utama disimpan terpisah dalam output proyek.

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

Harga jual per set mengikuti hasil Kalkulator Print Custom Tigo3D dan sudah termasuk kemasan. Seluruh tipe dalam satu produk digabung menjadi satu set lengkap, dengan kemasan dihitung sekali. Pilihan tipe lama di keranjang perlu ditinjau ulang sebelum checkout. Ongkir sandbox ditetapkan Rp0. Pengujian memakai simulator resmi Midtrans; jangan menggunakan aplikasi bank/e-wallet atau uang sungguhan. Tidak ada pengiriman barang. Data pesanan uji dan PDF disimpan privat di server ketika akun dan penyimpanan telah dihubungkan. Aktivasi produksi, stok, admin operasional, ongkir aktual, dan pengiriman email/WhatsApp berada di luar fitur sandbox ini.

Jalankan `pnpm test` untuk pengujian perhitungan nominal, idempotensi, pemalsuan notifikasi, pencocokan transaksi, pemulihan koneksi, dan akses PDF. `node tools/check-receipt.mjs` menghasilkan PDF pemeriksaan 10 produk set lengkap; gunakan `--stress` untuk nama/email panjang dan pagination. Pengujian lokal memakai kontrak Midtrans yang digantikan oleh penyedia uji; keberhasilannya tidak berarti koneksi ke akun Midtrans sudah diuji.

Gambar berasal dari katalog produk TIGO LAB yang disediakan untuk proyek ini.

## Animasi cara bermain

Metadata video, poster, dan tiga langkah setiap produk ada di `dist/demos.js`. Sebelas produk Montessori memiliki animasi dengan model 3D. Video MP4 H.264 tanpa audio ada di `dist/assets/videos/`. Model mengacu pada foto katalog dan memperagakan aktivitas; video bukan rekaman produk fisik dan model bukan pengukuran CAD.

Video dan poster aktif menggunakan logo TIGO LAB, judul Fredoka, petunjuk Nunito, panel krem, serta aksen biru, oranye, dan kuning. Kompositor membaca token warna langsung dari `dist/styles.css` dan font WOFF2 dari `dist/assets/fonts/`, sehingga identitas video mengikuti website. Nama aset memakai varian baru ketika visual diubah agar browser mengambil versi terbaru.

Sumber model Blender utama ada di `tools/demos3d/models.py`, dengan geometri berlubang, komponen terpisah, tali, pencahayaan, dan animasi tiap bagian. Fraction dan Emotion Slider memiliki modul model tersendiri. `tools/demos3d/engine.py` berisi fungsi geometri dan rendering bersama. Spinning Shapes Stacker memakai model `stacker()` dengan tiang spiral dan mur yang berputar mengikuti ulir; `stacker_stage.py` menyimpan renderer mesh versi terdahulu. Nama produk dan langkah bermain disimpan di `tools/demos3d/products.json`.

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
