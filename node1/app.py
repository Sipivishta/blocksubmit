from flask import Flask, request, jsonify
import hashlib
import json
from datetime import datetime

app = Flask(__name__)

FILE_NAME = "blockchain_5000.json"

# ---------------- LOAD BLOCKCHAIN ----------------
try:
    with open(FILE_NAME, "r") as f:
        blockchain = json.load(f)
except:
    blockchain = []

# ---------------- SAVE BLOCKCHAIN ----------------
def save_chain():
    with open(FILE_NAME, "w") as f:
        json.dump(blockchain, f, indent=4)


# ---------------- ADD BLOCK ----------------
@app.route('/add_block', methods=['POST'])
def add_block():
    data = request.json

    student_id = data.get("student_id")
    course_id = data.get("course_id")
    file_hash = data.get("file_hash")

    if not student_id or not course_id or not file_hash:
        return jsonify({"error": "Missing data"}), 400

    # ✅ SAFE previous hash (fixes your error)
    if blockchain and isinstance(blockchain[-1], dict) and "hash" in blockchain[-1]:
        previous_hash = blockchain[-1]["hash"]
    else:
        previous_hash = "0"

    # Create block
    block = {
        "index": len(blockchain) + 1,
        "student_id": student_id,
        "course_id": course_id,
        "file_hash": file_hash,
        "timestamp": str(datetime.now()),
        "previous_hash": previous_hash
    }

    # Generate block hash
    block_string = json.dumps(block, sort_keys=True).encode()
    block["hash"] = hashlib.sha256(block_string).hexdigest()

    # Add to chain
    blockchain.append(block)
    save_chain()

    return jsonify({
        "message": "Block added successfully",
        "block": block
    })


# ---------------- GET BLOCKCHAIN ----------------
@app.route('/chain', methods=['GET'])
def get_chain():
    return jsonify(blockchain)


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(port=5000, debug=True)