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
        selected_role = request.form.get("role")

        users = load_users()

        if username not in users:
            return render_template("login.html", msg="User not found ❌")

        user = users[username]

        if user["password"] != password:
            return render_template("login.html", msg="Wrong password ❌")

        if selected_role != user.get("role"):
            return render_template("login.html", msg="Wrong role ❌")

        session["user"] = username
        session["role"] = user["role"]
        session["courses"] = user.get("courses", [])

        return redirect("/student" if user["role"] == "student" else "/teacher")

    return render_template("login.html", msg=msg)


# ---------------- SIGNUP ---------------- #
@app.route("/signup", methods=["GET", "POST"])
def signup():
    msg = ""

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        role = request.form.get("role")

        users = load_users()

        if username in users:
            return render_template("signup.html", msg="User already exists ❌")

        users[username] = {
            "password": password,
            "role": role,
            "courses": []
        }

        with open("users.json", "w") as f:
            json.dump(users, f, indent=4)

        return redirect("/login")

    return render_template("signup.html", msg=msg)


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
            return render_template("student.html", msg="No file ❌")

        file_hash = hashlib.sha256(file.read()).hexdigest()
        student_id = session["user"]

        try:
            res = requests.get(f"{NODE_URL}/chain")
            chain = res.json()["chain"]
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

    try:
        res = requests.get(f"{NODE_URL}/chain")
        chain = res.json()["chain"]
    except:
        chain = []

    # 🔥 KEEP ONLY LATEST VERSION PER STUDENT+COURSE
    latest_records = {}

    for block in chain:
        key = (block["student_id"], block["course_id"])

        if key not in latest_records:
            latest_records[key] = block
        else:
            if block.get("version", 1) > latest_records[key].get("version", 1):
                latest_records[key] = block

    chain = list(latest_records.values())

    # 🔥 SORT (LATEST FIRST)
    chain = sorted(chain, key=lambda x: x["timestamp"], reverse=True)

    selected_course = ""

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
        return jsonify({"status": "error", "message": "No file ❌"})

    file_hash = hashlib.sha256(file.read()).hexdigest()

    try:
        res = requests.get(f"{NODE_URL}/chain")
        chain = res.json()["chain"]
    except:
        chain = []

    relevant = [
        b for b in chain
        if b["student_id"] == student_id and b["course_id"] == course_id
    ]

    if not relevant:
        return jsonify({"status": "not_found", "message": "No record ❌"})

    latest = max(relevant, key=lambda x: x.get("version", 1))

    if file_hash == latest["file_hash"]:
        return jsonify({
            "status": "original",
            "message": f"Original File ✅ (Version {latest['version']})"
        })
    elif any(file_hash == b["file_hash"] for b in relevant):
        return jsonify({
            "status": "old",
            "message": "Old Version ⚠️"
        })
    else:
        return jsonify({
            "status": "modified",
            "message": "Modified ❌"
        })


# ---------------- RUN ---------------- #
if __name__ == "__main__":
    app.run(port=5002, debug=True)