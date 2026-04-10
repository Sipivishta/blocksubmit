# 🚀 BlockSubmit: Blockchain-Based Assignment Verification System

![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-WebApp-green)
![Blockchain](https://img.shields.io/badge/Concept-Simulation-orange)
![Status](https://img.shields.io/badge/Project-Active-success)

> 🔐 A blockchain-inspired system for secure, tamper-evident assignment submission and verification

---

## 📌 Overview

**BlockSubmit** is a **blockchain-inspired file verification system** that ensures:

* ✔️ File integrity using hashing
* ✔️ Tamper detection
* ✔️ Version tracking
* ✔️ Role-based access (Student / Teacher)
* ✔️ Multi-node storage (simulated decentralization)

---

## 🎯 Problem Statement

Traditional submission systems suffer from:

* ❌ File modification after submission
* ❌ No reliable proof of originality
* ❌ No version tracking
* ❌ Centralized storage (single point of failure)

---

## 💡 Solution

BlockSubmit addresses these issues using:

* 🔐 SHA-256 hashing (file fingerprinting)
* ⛓️ Blockchain-style linked records
* 🕒 Timestamp-based tracking
* 🔄 Version control for files
* 🌐 Multi-node storage for redundancy

---

## 🌟 Features

* 🔐 Login & Signup system
* 👥 Role-based dashboards (Student / Teacher)
* 📂 Assignment upload with version tracking
* 🔍 File verification:

  * Original
  * Modified
  * Invalid
* ⛓️ Blockchain-style storage
* 🌐 Multi-node system (Node1 & Node2)

---

## 🏗️ Project Structure

```
assignment_blockchain/
│
├── main_app.py
├── users.json
├── requirements.txt
├── README.md
│
├── node1/
│   ├── app.py
│   └── blockchain_5000.json
│
├── node2/
│   ├── app.py
│   └── blockchain_5001.json
│
├── templates/
│   ├── login.html
│   ├── signup.html
│   ├── student.html
│   ├── teacher.html
│
└── blockchain.json  (legacy / optional)
```

---

## ⚙️ How It Works

### 🔹 Submission Flow

1. Student uploads assignment
2. System generates SHA-256 hash
3. A block is created with:

   * Student ID
   * Course ID
   * Version
   * File hash
   * Timestamp
   * Previous hash
4. Block is stored in:

   * Node1 (`blockchain_5000.json`)
   * Node2 (`blockchain_5001.json`)

---

### 🔹 Verification Flow

1. Teacher uploads a file
2. System generates hash
3. Hash is compared with stored blockchain data

---

## 🔍 Verification Logic

| Case                         | Result                      |
| ---------------------------- | --------------------------- |
| Hash matches original        | ✅ Original                  |
| Hash matches another version | ⚠️ Modified (Version Found) |
| No match found               | ❌ Invalid                   |

---

## 🌐 Multi-Node Architecture

* Node1 → stores blockchain copy (port 5000)
* Node2 → stores blockchain copy (port 5001)

### 🔹 Purpose of Nodes:

* Data redundancy
* Fault tolerance
* Demonstration of decentralization

> ⚠️ Note: Nodes do not implement consensus or synchronization. This is a simulation.

---

## 🛠️ Tech Stack

* Python (Flask)
* HTML + CSS
* SHA-256 (hashlib)
* REST APIs
* JSON-based storage

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

### 3️⃣ Start Main Application

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

* Upload assignments
* Automatic version tracking

### 👨‍🏫 Teacher

* Verify files
* View submission authenticity
* Identify versions

---

## 🚀 Future Enhancements

* 🔄 Node synchronization
* ⛏️ Consensus mechanisms (PoA / PoS)
* 🗄️ Database integration (MongoDB / SQL)
* 🔐 JWT authentication
* ☁️ Cloud deployment

---

## 🧠 Key Learnings

* Blockchain fundamentals
* Hash-based data integrity
* Multi-node architecture
* Role-based system design
* Real-world application simulation

---

## 👨‍💻 Author

**Podili Sipivishta**

---

## ⭐ Contribution

Feel free to fork and enhance this project!

---

## 📜 License

Educational / Academic Use
