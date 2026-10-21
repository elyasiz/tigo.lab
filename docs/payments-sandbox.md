# QRIS Midtrans sandbox - TIGO LAB

Integrasi ini hanya untuk pengujian. Kode menolak Server Key produksi dan selalu
menghubungi `https://api.sandbox.midtrans.com`. Gunakan data contoh, bukan data
pelanggan sungguhan. Jangan bayar QR sandbox dengan bank atau e-wallet sungguhan.

## Aktivasi pada Vercel

Penyimpanan privat `tigo-lab-sandbox-orders` sudah dibuat pada paket Hobby dan
terhubung hanya ke `tigo-lab` untuk Production dan Preview. Tidak ada upgrade
berbayar. Aktivasi transaksi masih menunggu akun dan Server Key sandbox Midtrans.

1. Buat akun Midtrans dan selesaikan verifikasi email/ketentuan melalui dashboard
   Midtrans. Pilih lingkungan **Sandbox** dan ambil **Server Key** pada pengaturan
   akses akun. Jangan taruh kunci di Git, kode frontend, atau chat.
2. Setelah disetujui pemilik akun Vercel, buat Blob Store **privat** khusus proyek
   `tigo-lab`, misalnya `tigo-lab-sandbox-orders`. Hubungkan ke proyek agar Vercel
   menyediakan `BLOB_READ_WRITE_TOKEN`. Jangan hubungkan store proyek lain untuk
   memperluas akses datanya. Tidak diperlukan database publik.
3. Tambahkan `MIDTRANS_SERVER_KEY` sandbox di Environment Variables proyek Vercel.
   Pilih environment yang akan diuji, lalu redeploy. `APP_BASE_URL` opsional dan
   default-nya `https://tigo-lab.vercel.app`.
4. Pastikan `GET /api/payments?action=config` mengembalikan `ready: true` dan
   `environment: sandbox`. Respons ini tidak menampilkan kunci atau token.
5. Notification URL akun Midtrans: `https://tigo-lab.vercel.app/api/midtrans`.
   Server juga mengirim `X-Override-Notification` saat membuat charge. Halaman
   memeriksa ulang melalui Get Status API jika webhook belum diterima.
6. Buat satu pesanan dari website. Salin URL QRIS melalui tombol yang tersedia,
   tempel pada simulator resmi, dan selesaikan pembayaran uji. Kembali ke website
   untuk melihat status lunas dan mengunduh PDF. Status juga pulih setelah reload.

Jika akun QRIS/Core API belum aktif, server menampilkan kegagalan yang jelas dan
tidak membuat QR palsu. Harga dan ongkir pada mode ini adalah contoh; kode belum
menyediakan pembayaran produksi.

## Alur dan penyimpanan

- Sumber produk dan harga tunggal: `dist/products.js`, dipakai frontend dan server.
- Browser mengirim ID produk, jumlah, data penerima contoh, konfirmasi total, dan
  idempotency key acak. Server menghitung ulang jumlah dan menolak total yang berubah.
- Pesanan dibuat sebelum permintaan Midtrans. Pengulangan permintaan memakai nomor
  pesanan yang sama. Timeout tidak diatasi dengan membuat tagihan baru.
- Order dan counter batas percobaan disimpan dalam Blob privat. Pembacaan mengabaikan
  cache, dan pembaruan memakai ETag compare-and-swap untuk menghindari lost update.
- Webhook diperiksa signature SHA-512-nya dan dikonfirmasi dengan Get Status API.
  Nomor pesanan, transaction ID, merchant, nominal, mata uang dan metode QRIS harus
  cocok. Hanya settlement yang terverifikasi dapat mengubah status menjadi lunas.
- Notifikasi berulang tidak menggandakan pembayaran. Notifikasi pending/expire yang
  terlambat tidak menurunkan status lunas. Refund memiliki status terpisah.
- PDF dibuat otomatis setelah lunas dan disimpan privat pada nama deterministik.
  Kegagalan PDF tidak menghapus pembayaran; pembuatannya dicoba kembali. Endpoint
  webhook meminta retry bila PDF belum siap. PDF selalu ditandai sandbox/uang tidak nyata.
- Akses order, QR, dan PDF memerlukan bearer token acak/turunan HMAC yang tidak dapat
  ditebak. Nomor pesanan saja tidak memberi akses. Tidak ada endpoint daftar order publik.
- Browser menyimpan kapabilitas akses dan penanda pemulihan, bukan data penerima atau
  bukti lunas. Tautan pesanan pribadi menggunakan fragment URL; token tidak dimasukkan
  ke query HTTP. Jangan membagikan tautan tersebut kepada pihak lain.
- Pembatalan memeriksa status Midtrans terlebih dahulu. Jika sudah lunas, sistem
  mempertahankan pelunasan dan membuat bukti pembayaran.

## Endpoint

| Endpoint | Penggunaan |
| --- | --- |
| GET `/api/payments?action=config` | Kesiapan sandbox, tanpa rahasia |
| POST `/api/payments?action=create` | Validasi keranjang dan membuat transaksi |
| POST `/api/payments?action=resume` | Memulihkan respons create yang terputus dengan idempotency key |
| GET `/api/payments?action=status&orderId=...` | Status privat, dengan Authorization Bearer |
| POST `/api/payments?action=refresh&orderId=...` | Pemeriksaan status ulang, dengan bearer token |
| POST `/api/payments?action=cancel&orderId=...` | Pembatalan transaksi yang belum lunas |
| GET `/api/payments?action=qr&orderId=...` | Gambar QRIS dari host sandbox yang dibatasi |
| GET `/api/payments?action=receipt&orderId=...` | PDF setelah lunas, dengan bearer token |
| POST `/api/midtrans` | Notifikasi Midtrans yang ditandatangani |

Respons privat menggunakan `Cache-Control: private, no-store`. Nominal disimpan
sebagai rupiah integer, maksimum Rp10.000.000. Pembuatan dibatasi 12 percobaan per
alamat jaringan per jam. Ongkir sandbox Rp0 dan tidak ada surcharge QRIS.

## Pengujian lokal

`pnpm test` memeriksa state machine dan kontrak HTTP menggunakan penyedia lokal;
pengujian ini tidak mengirim transaksi ke Midtrans. `pnpm dev` memerlukan
konfigurasi sandbox yang sesungguhnya. Untuk QA tanpa akun, jalankan:

```sh
node tools/dev-server.mjs --fixtures
```

Server hanya mendengarkan `127.0.0.1:4180`. Penyedia uji dan endpoint simulator
`/__test/*` tersedia hanya dengan flag tersebut. CLI menolak berjalan jika
`VERCEL` terpasang, dan API deployment tidak mengimpor penyedia uji.

Data lokal diabaikan Git dalam `tmp/local-payment-fixtures`. Bukti dan order dapat
dibuka lagi setelah server dihidupkan ulang. `node tools/check-receipt.mjs --stress`
menguji layout PDF untuk nama/email panjang dan sepuluh jenis barang.

## Sumber resmi

- [QRIS Charge API](https://docs.midtrans.com/reference/qris)
- [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status)
- [Handle Notifications](https://docs.midtrans.com/reference/handle-notifications)
- [Pengujian sandbox](https://docs.midtrans.com/docs/testing-payment-on-sandbox)
- [Simulator QRIS resmi](https://simulator.sandbox.midtrans.com/v2/qris/index)
- [Vercel Blob SDK, consistent reads dan conditional writes](https://vercel.com/docs/vercel-blob/using-blob-sdk)
