from flask import Flask, request, jsonify
import hashlib
import json
import datetime
import os

app = Flask(__name__)

FILE_NAME = "blockchain_5001.json"

# Load blockchain
if os.path.exists(FILE_NAME):
    with open(FILE_NAME) as f:
        blockchain = json.load(f)
else:
    blockchain = []

def save_blockchain():
    with open(FILE_NAME, "w") as f:
        json.dump(blockchain, f, indent=4)


@app.route("/add_block", methods=["POST"])
def add_block():
    data = request.json

    student_id = data["student_id"]
    course_id = data["course_id"]

    # 🔥 VERSION LOGIC
    version = 1
    for block in blockchain:
        if (block["data"]["student_id"] == student_id and 
            block["data"]["course_id"] == course_id):
            version += 1

    new_block = {
        "index": len(blockchain) + 1,
        "timestamp": str(datetime.datetime.now()),
        "data": {
            "student_id": student_id,
            "course_id": course_id,
            "hash": data["hash"],
            "version": version
        },
        "previous_hash": blockchain[-1]["hash"] if blockchain else "0"
    }

    new_block["hash"] = hashlib.sha256(
        json.dumps(new_block, sort_keys=True).encode()
    ).hexdigest()

    blockchain.append(new_block)
    save_blockchain()

    return jsonify(new_block)


@app.route("/get_chain", methods=["GET"])
def get_chain():
    return jsonify({"chain": blockchain})


if __name__ == "__main__":
    app.run(port=5001, debug=True)