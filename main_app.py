from flask import Flask, render_template, request, redirect, session
import requests, hashlib

app = Flask(__name__)
app.secret_key = "secret123"

NODE1 = "http://127.0.0.1:5000"
NODE2 = "http://127.0.0.1:5001"


# ---------------- LOGIN ----------------
@app.route("/", methods=["GET", "POST"])
def login():
    msg = ""

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        session.clear()

        if username == "student1" and password == "123":
            session["user"] = username
            session["role"] = "student"
            return redirect("/student")

        elif username == "teacher1" and password == "123":
            session["user"] = username
            session["role"] = "teacher"
            return redirect("/teacher")

        else:
            msg = "❌ Invalid credentials"

    return render_template("login.html", msg=msg)


# ---------------- LOGOUT ----------------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


# ---------------- STUDENT ----------------
@app.route("/student", methods=["GET", "POST"])
def student():
    if "user" not in session or session.get("role") != "student":
        return redirect("/")

    msg = ""
    verify_msg = ""

    if request.method == "POST":
        student_id = request.form.get("student_id")
        course_id = request.form.get("course_id")
        file = request.files.get("file")

        if not student_id or not course_id or not file:
            msg = "⚠️ All fields required"
        else:
            file_hash = hashlib.sha256(file.read()).hexdigest()

            data = {
                "student_id": student_id,
                "course_id": course_id,
                "file_hash": file_hash
            }

            try:
                # send to NODE1 (main node)
                r1 = requests.post(f"{NODE1}/add_block", json=data)

                # try sending to NODE2 (optional)
                try:
                    requests.post(f"{NODE2}/add_block", json=data)
                except:
                    print("Node2 not running")

                if r1.status_code == 200:
                    msg = "✅ Upload successful"
                else:
                    msg = f"❌ Upload failed: {r1.text}"

            except Exception as e:
                msg = f"Error: {str(e)}"

    return render_template("student.html", msg=msg, verify_msg=verify_msg)


# ---------------- STUDENT VERIFY ----------------
@app.route("/verify_student", methods=["POST"])
def verify_student():
    if "user" not in session:
        return redirect("/")

    verify_msg = ""

    file = request.files.get("file")

    if file:
        file_hash = hashlib.sha256(file.read()).hexdigest()

        try:
            res = requests.get(f"{NODE1}/chain")
            chain = res.json()

            found = any(block.get("file_hash") == file_hash for block in chain)

            if found:
                verify_msg = "✅ File is ORIGINAL"
            else:
                verify_msg = "❌ File NOT FOUND"

        except:
            verify_msg = "⚠️ Verification error"

    return render_template("student.html", msg="", verify_msg=verify_msg)


# ---------------- TEACHER ----------------
@app.route("/teacher", methods=["GET", "POST"])
def teacher():
    if "user" not in session or session.get("role") != "teacher":
        return redirect("/")

    chain = []
    msg = ""

    try:
        res = requests.get(f"{NODE1}/chain")
        chain = res.json()
    except:
        chain = []

    if request.method == "POST":
        file = request.files.get("file")

        if file:
            file_hash = hashlib.sha256(file.read()).hexdigest()

            found = any(block.get("file_hash") == file_hash for block in chain)

            if found:
                msg = "✅ File is ORIGINAL"
            else:
                msg = "❌ File NOT FOUND"

    return render_template("teacher.html", chain=chain, msg=msg)


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(port=5002, debug=True)