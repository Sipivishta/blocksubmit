from flask import Flask, render_template, request, redirect, session, jsonify
import hashlib
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

    return render_template("login.html", msg="")


# ---------------- SIGNUP ---------------- #
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        role = request.form.get("role")
        courses_input = request.form.get("courses")

        users = load_users()

        if username in users:
            return render_template("signup.html", msg="User already exists ❌")

        courses = [c.strip() for c in courses_input.split(",") if c.strip()]

        if role == "student" and len(courses) > 6:
            return render_template("signup.html", msg="Max 6 courses ❌")

        if role == "teacher" and len(courses) > 2:
            return render_template("signup.html", msg="Max 2 courses ❌")

        if len(courses) == 0:
            return render_template("signup.html", msg="Enter at least one course ❌")

        users[username] = {
            "password": password,
            "role": role,
            "courses": courses
        }

        with open("users.json", "w") as f:
            json.dump(users, f, indent=4)

        return redirect("/login")

    return render_template("signup.html", msg="")


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

        if not file:
            return render_template("student.html", msg="No file ❌")

        file_hash = hashlib.sha256(file.read()).hexdigest()
        student_id = session["user"]

        try:
            chain = requests.get(f"{NODE_URL}/chain").json()["chain"]
        except:
            chain = []

        version = 1
        for b in chain:
            if b["student_id"] == student_id and b["course_id"] == course_id:
                version = max(version, b.get("version", 1) + 1)

        payload = {
            "student_id": student_id,
            "course_id": course_id,
            "file_hash": file_hash,
            "version": version
        }

        requests.post(f"{NODE_URL}/add_block", json=payload)

        msg = f"File Uploaded ✅ (Version {version})"

    return render_template("student.html", msg=msg)


# ---------------- TEACHER ---------------- #
@app.route("/teacher", methods=["GET", "POST"])
def teacher():

    if "user" not in session or session.get("role") != "teacher":
        return redirect("/")

    try:
        chain = requests.get(f"{NODE_URL}/chain").json()["chain"]
    except:
        chain = []

    selected_course = request.form.get("course_id") if request.method == "POST" else ""

    if selected_course:
        chain = [b for b in chain if b["course_id"] == selected_course]

    chain = sorted(chain, key=lambda x: x["timestamp"])

    # COPY DUPLICATES
    hash_map = {}
    for b in chain:
        key = (b["course_id"], b["file_hash"])
        hash_map.setdefault(key, []).append(b)

    duplicates = {}
    copied_from = {}

    for key, blocks in hash_map.items():
        if len(blocks) > 1:
            original = blocks[0]["student_id"]
            for b in blocks:
                k = (b["student_id"], b["course_id"], b["file_hash"])
                duplicates[k] = True
                if b["student_id"] != original:
                    copied_from[k] = original

    # VERSION DUPLICATES
    student_map = {}
    for b in chain:
        key = (b["student_id"], b["course_id"])
        student_map.setdefault(key, []).append(b)

    version_duplicates = {}

    for key, blocks in student_map.items():
        if len(blocks) > 1:
            for b in blocks:
                k = (b["student_id"], b["course_id"], b["file_hash"])
                version_duplicates[k] = True

    chain = sorted(chain, key=lambda x: x["timestamp"], reverse=True)

    return render_template(
        "teacher.html",
        chain=chain,
        courses=session.get("courses", []),
        selected_course=selected_course,
        duplicates=duplicates,
        copied_from=copied_from,
        version_duplicates=version_duplicates
    )


# ---------------- VERIFY (UPDATED) ---------------- #
@app.route("/verify", methods=["POST"])
def verify():

    file = request.files.get("file")
    student_id = request.form.get("student_id")
    course_id = request.form.get("course_id")

    if not file:
        return jsonify({"status": "error", "message": "No file ❌"})

    file_hash = hashlib.sha256(file.read()).hexdigest()

    try:
        chain = requests.get(f"{NODE_URL}/chain").json()["chain"]
    except:
        chain = []

    same = [b for b in chain if b["file_hash"] == file_hash and b["course_id"] == course_id]

    if not same:
        return jsonify({"status": "not_found", "message": "File not found ❌"})

    same = sorted(same, key=lambda x: x["timestamp"])
    original_block = same[0]

    original_student = original_block["student_id"]
    original_version = original_block.get("version", 1)

    student_blocks = [
        b for b in chain
        if b["student_id"] == student_id and b["course_id"] == course_id
    ]

    student_version = 1
    for b in student_blocks:
        if b["file_hash"] == file_hash:
            student_version = b.get("version", 1)

    if student_id == original_student:
        return jsonify({
            "status": "original",
            "message": f"Original File ✅ (Version {student_version})"
        })
    else:
        return jsonify({
            "status": "copied",
            "message": f"Copied from: {original_student} ⚠️ (Original Version {original_version})"
        })


# ---------------- RUN ---------------- #
if __name__ == "__main__":
    app.run(port=5002, debug=True)