# PaySplit 2.0 — Customer-Based Automated Payment Splitting Platform 🚀

A modern, high-performance UPI payment splitting and customer synchronization platform for retail merchants, vendors, and consumers.

**PaySplit 2.0** introduces direct passwordless **Customer Login via Mobile Number**, complete **Payment History & Receipts**, live **Vendor-to-Customer Bill Sharing (Real-Time Popoff)**, direct **Google Pay / PhonePe UPI Intent Payments**, and synchronized zero-delay **Green Tick** payment confirmations across both customer and vendor terminals simultaneously.

---

## ✨ PaySplit 2.0 New Features

- **📱 Customer Passwordless Login**: Customers log in directly using their 10-digit mobile number. Zero friction, instant access to personal bills and receipts.
- **📜 Customer Payment History & Receipts**: Customers can view all past transactions, merchant details, total amounts, date/time, and print official payment receipts with bank UTR reference numbers.
- **📲 Live "Share Bill to Customer" (Vendor → Customer Screen)**:
  - When a vendor enters the customer's mobile number and shares the bill, a real-time **Incoming Bill Popoff Modal** instantly appears on the customer's screen.
  - The customer sees the live bill, split portions, and scannable QR codes immediately.
- **🚀 One-Tap Google Pay & UPI Intent**:
  - Customers on mobile can tap **"Pay via Google Pay / UPI"** to open their preferred UPI app (Google Pay, PhonePe, Paytm, BHIM) with payee UPI ID and exact slice amount pre-filled.
  - Automatic NPCI UPI deep links: `upi://pay?pa=...&am=...&cu=INR...`.
- **🟢 Synchronized Real-Time Green Ticks**:
  - When payment is made, the QR code on the **customer screen** turns into an animated **Green Tick (`Paid ✓`)** with audio chime.
  - Simultaneously, the **vendor terminal** receives an instant SSE broadcast and turns into a **Green Tick** in real-time without refreshing.
- **🎉 Synchronized All-Complete Celebration**: Once all split portions are paid, both vendor and customer terminals display the full celebration confetti and verified completion breakdown.
- **⚡ Dynamic Bill Splitting**: Automatically splits large bills above bank transaction limits (e.g., ₹1,999) into 2, 3, 4, or custom portions.
- **🛡️ Multi-Role Security & Portal**: Dedicated portals for Customers, Vendors, and System Administrators.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti, QR Code Generator
- **Backend**: Node.js, Express 5, MongoDB Atlas (Mongoose), Server-Sent Events (SSE), JWT Authentication
- **Payments**: Direct NPCI UPI Intent & QR (`upi://pay`), Soundbox Web Audio Chime, Webhook Integration

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 2. Clone Repository
```bash
git clone https://github.com/Karan-desai-7299/PaySplit2.0-Customer-Based-Automated-Payment-Splitting-Platform.git
cd PaySplit2.0-Customer-Based-Automated-Payment-Splitting-Platform
```

### 3. Setup Backend
```bash
cd server
npm install
# Configure server/.env (PORT, MONGODB_URI, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD)
npm start
```

### 4. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```
Open **http://localhost:5173** (or backend at **http://localhost:5000**).

---

## 📱 How PaySplit 2.0 Works

1. **Vendor**: Types bill amount (e.g. ₹2,500) & customer mobile number (`9876543210`). The platform splits the bill into dynamic QR codes (e.g. ₹1,999 + ₹501).
2. **Share Bill**: Vendor clicks **"📲 Share Bill to Customer"**.
3. **Customer Popoff**: Customer logged in with mobile number `9876543210` instantly receives a live popoff modal with the merchant bill.
4. **Instant Payment**: Customer taps **"Pay via Google Pay"** or scans the QR, then confirms.
5. **Simultaneous Green Ticks**: Both customer and vendor screens turn into animated green ticks in real time with an audio confirmation chime.
6. **Receipt**: Customer views and prints the complete receipt in **Payment History**.
