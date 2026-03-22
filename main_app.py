from flask import Flask, render_template, request, redirect, session
import hashlib
import requests
import json

app = Flask(__name__)
app.secret_key = "secret"

# ---------------- LOGIN ----------------
@app.route("/", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    msg = ""

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        with open("users.json") as f:
            users = json.load(f)

        if username in users and users[username]["password"] == password:
            session["user"] = username
            session["role"] = users[username]["role"]

            if users[username]["role"] == "student":
                return redirect("/student")
            else:
                return redirect("/teacher")
        else:
            msg = "Invalid Credentials"

    return render_template("login.html", msg=msg)


# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# ---------------- STUDENT ----------------
@app.route("/student", methods=["GET", "POST"])
def student():
    if "user" not in session:
        return redirect("/login")

    msg = ""

    if request.method == "POST":
        file = request.files["file"]
        student_id = request.form["student_id"]
        course_id = request.form["course_id"]

        # 🔐 HASH FILE
        file_bytes = file.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        # 🔗 GET EXISTING CHAIN (for version)
        try:
            res = requests.get("http://127.0.0.1:5000/chain")
            chain = res.json().get("chain", [])
        except:
            chain = []

        # 🔢 VERSION LOGIC
        version = 1
        for block in chain:
            if block.get("student_id") == student_id and block.get("course_id") == course_id:
                version += 1

        # 🚀 SEND TO NODE
        data = {
            "student_id": student_id,
            "course_id": course_id,
            "file_hash": file_hash,
            "version": version
        }

        try:
            requests.post("http://127.0.0.1:5000/add_block", json=data)
            msg = "✅ Uploaded Successfully"
        except Exception as e:
            msg = f"❌ Upload Failed: {e}"

    return render_template("student.html", msg=msg)


# ---------------- TEACHER ----------------
@app.route("/teacher")
def teacher():
    if "user" not in session:
        return redirect("/login")

    try:
        res = requests.get("http://127.0.0.1:5000/chain")
        chain = res.json().get("chain", [])
    except:
        chain = []

    return render_template("teacher.html", chain=chain)


# ---------------- VERIFY ----------------
@app.route("/verify", methods=["POST"])
def verify():
    file = request.files["file"]

    file_hash = hashlib.sha256(file.read()).hexdigest()

    try:
        res = requests.get("http://127.0.0.1:5000/chain")
        chain = res.json().get("chain", [])
    except:
        chain = []

    for block in chain:
        if block.get("file_hash") == file_hash:
            return {"status": "original"}

    return {"status": "tampered"}


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(port=5002, debug=True)