<h1 align="center">✨ Hubble — Gerçek Zamanlı Mesajlaşma & Video Görüşme ✨</h1>

<p align="center">
  Anlık mesajlaşma, sesli & görüntülü iletişim ve topluluk yönetimini tek platformda birleştiren tam yığın bir iletişim uygulaması.
</p>

---

## Özellikler

- 🔐 **Kimlik Doğrulama** — JWT tabanlı kayıt/giriş sistemi ile güvenli kullanıcı yönetimi
- 💬 **Gerçek Zamanlı Mesajlaşma** — Thread, reaksiyon ve sabitlenmiş mesaj desteği
- 📂 **Dosya Paylaşımı** — Resim, PDF, ZIP ve daha fazlası
- 📊 **Anket** — Çoklu seçenek, anonim mod, öneri ve yorum
- 📨 **Direkt Mesaj & Özel Kanallar**
- 📹 **Birebir ve Grup Video Görüşmesi** — Ekran paylaşımı ve kayıt
- 🎙️ **Sesli Kanal** — Katılımcı takibi ve anlık bildirimler
- 🧠 **Metin Tabanlı Duygu Analizi** — Kanal mesajları üzerinde seçili mesajların duygu (sentiment) analizi; etiket, emoji ve güven skoru ile görselleştirme
- 🎥 **Video Toplantı Analizi** — Kaydedilen görüşmenin ses & video verisi işlenerek konuşmacı bazlı duygu analizi, yüz ifadesi tespiti ve tam transkript oluşturma; sonuçlar toplantıya katılan kişilere e-posta ile iletilme
- 🏠 **Sunucu/Workspace Yönetimi** — Davet koduyla katılım ve üye yönetimi
- 👥 **Arkadaş Sistemi** — Arkadaşlık isteği gönderme ve engelleme
- 🔔 **Masaüstü Bildirimleri**
- 🌗 **Açık / Koyu Tema**

---

## Kurulum

### Gereksinimler

- Node.js 18+
- MongoDB
- Python ML Servisi (`http://localhost:8000`)

### Backend (`/backend`)

```bash
cd backend
npm install
npm run dev
```

### Frontend (`/frontend`)

```bash
cd frontend
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde çalışır.

---

## Ortam Değişkenleri (.env)

### Backend (`/backend/.env`)

```
PORT=5001
MONGO_URI=mongo_baglanti_adresiniz

NODE_ENV=development

CLERK_PUBLISHABLE_KEY=clerk_publishable_key
CLERK_SECRET_KEY=clerk_secret_key

STREAM_API_KEY=stream_api_key
STREAM_API_SECRET=stream_api_secret

SENTRY_DSN=sentry_dsn

INNGEST_EVENT_KEY=inngest_event_key
INNGEST_SIGNING_KEY=inngest_signing_key

CLIENT_URL=http://localhost:5173

ML_API_URL=http://127.0.0.1:8000
```

### Frontend (`/frontend/.env`)

```
VITE_CLERK_PUBLISHABLE_KEY=clerk_publishable_key
VITE_STREAM_API_KEY=stream_api_key
VITE_SENTRY_DSN=sentry_dsn
VITE_API_BASE_URL=http://localhost:5001/api
```

---

## Deployment

Uygulama Vercel üzerinde yayınlanmaktadır.

- **Backend:** Serverless fonksiyon olarak (`backend/vercel.json`)
- **Frontend:** SPA catch-all yönlendirmesiyle (`frontend/vercel.json`)
