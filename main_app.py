from flask import Flask, render_template, request, redirect, session, jsonify
import hashlib
import datetime
import requests
import json
import os

app = Flask(__name__)
app.secret_key = "secret123"

NODE_URL = "http://127.0.0.1:5000"

# ---------------- LOAD USERS ---------------- #
def load_users():
    if not os.path.exists("users.json"):
        return {}
    with open("users.json", "r") as f:
        return json.load(f)


# ---------------- LOGIN ---------------- #
@app.route("/", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    msg = ""

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        selected_role = request.form.get("role")  # 🔥 from UI toggle

        users = load_users()

        # ❌ USER NOT FOUND
        if username not in users:
            msg = "User not found ❌"
            return render_template("login.html", msg=msg)

        user = users[username]

        # ❌ WRONG PASSWORD
        if user["password"] != password:
            msg = "Wrong password ❌"
            return render_template("login.html", msg=msg)

        actual_role = user.get("role", "")

        # 🚨 ROLE VALIDATION (MAIN FIX)
        if selected_role != actual_role:
            msg = f"You are registered as {actual_role.upper()} ❌"
            return render_template("login.html", msg=msg)

        # ✅ SESSION STORE
        session["user"] = username
        session["role"] = actual_role
        session["courses"] = user.get("courses", [])

        # ✅ REDIRECT CORRECTLY
        return redirect("/student" if actual_role == "student" else "/teacher")

    return render_template("login.html", msg=msg)


# ---------------- LOGOUT ---------------- #
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


# ---------------- STUDENT ---------------- #
@app.route("/student", methods=["GET", "POST"])
def student():

    if "user" not in session or session.get("role") != "student":
        return redirect("/")

    msg = ""

    if request.method == "POST":
        file = request.files.get("file")
        course_id = request.form.get("course_id")

        if not file or file.filename == "":
            msg = "No file selected ❌"
            return render_template("student.html", msg=msg)

        file_data = file.read()
        file_hash = hashlib.sha256(file_data).hexdigest()
        student_id = session["user"]

        # 🔥 GET BLOCKCHAIN
        try:
            res = requests.get(f"{NODE_URL}/chain")
            chain = res.json()
        except:
            chain = []

        # 🔥 VERSION LOGIC
        version = 1
        for block in chain:
            if block["student_id"] == student_id and block["course_id"] == course_id:
                version = max(version, block.get("version", 1) + 1)

        payload = {
            "student_id": student_id,
            "course_id": course_id,
            "file_hash": file_hash,
            "timestamp": str(datetime.datetime.now()),
            "version": version
        }

        try:
            requests.post(f"{NODE_URL}/add_block", json=payload)
            msg = f"Uploaded ✅ Version {version}"
        except:
            msg = "Upload failed ❌"

    return render_template("student.html", msg=msg)


# ---------------- TEACHER ---------------- #
@app.route("/teacher", methods=["GET", "POST"])
def teacher():

    if "user" not in session or session.get("role") != "teacher":
        return redirect("/")

    selected_course = ""

    try:
        res = requests.get(f"{NODE_URL}/chain")
        chain = res.json()
    except:
        chain = []

    if request.method == "POST":
        selected_course = request.form.get("course_id")

        if selected_course:
            chain = [b for b in chain if b["course_id"] == selected_course]

    return render_template(
        "teacher.html",
        chain=chain,
        courses=session.get("courses", []),
        selected_course=selected_course
    )


# ---------------- VERIFY ---------------- #
@app.route("/verify", methods=["POST"])
def verify():

    file = request.files.get("file")
    student_id = request.form.get("student_id")
    course_id = request.form.get("course_id")

    if not file:
        return jsonify({"status": "error", "message": "No file uploaded ❌"})

    file_hash = hashlib.sha256(file.read()).hexdigest()

    try:
        res = requests.get(f"{NODE_URL}/chain")
        chain = res.json()
    except:
        chain = []

    # 🔥 FILTER MATCHING RECORDS
    relevant = [
        b for b in chain
        if b["student_id"] == student_id and b["course_id"] == course_id
    ]

    if not relevant:
        return jsonify({
            "status": "not_found",
            "message": "No submission found ❌"
        })

    latest = max(relevant, key=lambda x: x.get("version", 1))

    # ✅ ORIGINAL
    if file_hash == latest["file_hash"]:
        return jsonify({
            "status": "original",
            "message": f"Original File ✅ (Version {latest['version']})"
        })

    # ⚠ OLD VERSION
    elif any(file_hash == b["file_hash"] for b in relevant):
        return jsonify({
            "status": "old",
            "message": "Old Version File ⚠️"
        })

    # ❌ MODIFIED / WRONG FILE
    else:
        return jsonify({
            "status": "updated",
            "message": "File Modified ❌"
        })


# ---------------- RUN ---------------- #
if __name__ == "__main__":
    app.run(port=5002, debug=True)