# 🚀 BlockSubmit: Blockchain Assignment Submission System

![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-WebApp-green)
![Blockchain](https://img.shields.io/badge/Concept-Blockchain-orange)
![Status](https://img.shields.io/badge/Project-Active-success)

> 🔐 **Secure, immutable, and transparent academic record-keeping using blockchain principles**

---

## 📌 Overview

**BlockSubmit** is a blockchain-inspired assignment submission system that ensures:

* ✔️ **Data Integrity**
* ✔️ **Tamper-proof Records**
* ✔️ **Verifiable Submissions**

It acts like a **digital notary system** for academic submissions.

---

## 🎯 Problem Statement

Traditional systems suffer from:

* ❌ File modification after submission
* ❌ No reliable timestamp proof
* ❌ Data loss or tampering
* ❌ Disputes between students & teachers

---

## 💡 Solution

BlockSubmit solves this using:

* 🔐 SHA-256 hashing
* ⛓️ Blockchain-style linked records
* 🕒 Immutable timestamps
* 🌐 Multi-node storage simulation

---

## 🌟 Features

* 📂 Assignment Upload System
* 🔐 SHA-256 File Hashing
* ⛓️ Blockchain Record Storage
* 🕒 Timestamp Tracking
* 🔍 File Verification System
* 🌐 Multi-node Architecture (Node1 & Node2)
* 🎨 Modern Dark UI

---

## 🏗️ Project Structure

```
assignment_blockchain/
│
├── main_app.py              # Main UI + Routing (Port 5002)
├── users.json               # Login credentials
├── requirements.txt
├── README.md
│
├── node1/
│   ├── app.py               # Node 1 (Port 5000)
│   └── blockchain_5000.json
│
├── node2/
│   ├── app.py               # Node 2 (Port 5001)
│   └── blockchain_5001.json
│
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── student.html
│   ├── teacher.html
│
└── blockchain.json          # (Optional/legacy)
```

---

## ⚙️ How It Works

1. Student uploads assignment
2. File is hashed using **SHA-256**
3. Block is created with:

```
Student ID
Course ID
File Hash
Timestamp
Previous Hash
```

4. Block is stored in blockchain
5. Teacher verifies using hash comparison

---

## 🔗 Blockchain Concepts Used

* 🔐 **Hashing (SHA-256)**
* ⛓️ **Linked Blocks (Previous Hash)**
* 🕒 **Timestamping**
* 📂 **Immutable Storage (JSON-based)**
* 🌐 **Distributed Nodes Simulation**

---

## 🛠️ Tech Stack

* **Backend:** Python (Flask)
* **Frontend:** HTML + CSS (Dark UI)
* **Security:** SHA-256 (hashlib)
* **Storage:** JSON
* **Architecture:** REST APIs

---

## ▶️ How to Run

### 1️⃣ Start Node 1

```bash
cd node1
python app.py
```

### 2️⃣ Start Node 2

```bash
cd node2
python app.py
```

### 3️⃣ Start Main App

```bash
python main_app.py
```

---

## 🌐 Access URLs

| Service  | URL                   |
| -------- | --------------------- |
| Main App | http://127.0.0.1:5002 |
| Node 1   | http://127.0.0.1:5000 |
| Node 2   | http://127.0.0.1:5001 |

---

## 👨‍🏫 Roles

### 🎓 Student

* Upload assignment
* Generate file hash
* Verify file

### 👨‍🏫 Teacher

* View blockchain records
* Verify authenticity
* Detect tampering

---

## 🔍 Verification Logic

```
Step 1 → Hash uploaded file
Step 2 → Fetch blockchain hash
Step 3 → Compare both
```

* ✅ Match → File is ORIGINAL
* ❌ Mismatch → File is TAMPERED

---

## 🚀 Future Enhancements

* 🔄 Node synchronization
* ⛏️ Proof-of-Work (Mining)
* 🗄️ Database (MongoDB / PostgreSQL)
* 🔐 Secure Authentication (JWT)
* ☁️ Cloud Deployment (Docker + AWS)
* 📊 Dashboard Analytics

---

## 🧠 Key Learnings

* Blockchain fundamentals
* Hashing & data integrity
* REST API development
* Multi-node architecture
* Real-world system design

---

## 👨‍💻 Author

**Podili Sipivishta**

---

## ⭐ Contribution

Feel free to fork, improve, and build on this project!

---

## 📜 License

This project is for academic and educational purposes.
