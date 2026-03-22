from flask import Flask, request, jsonify
import hashlib, json
from datetime import datetime

app = Flask(__name__)

FILE_NAME = "blockchain_5001.json"

try:
    with open(FILE_NAME) as f:
        blockchain = json.load(f)
except:
    blockchain = []

@app.route('/add_block', methods=['POST'])
def add_block():
    data = request.json

    student_id = data.get("student_id")
    course_id = data.get("course_id")
    file_hash = data.get("file_hash")

    if not student_id or not course_id or not file_hash:
        return jsonify({"error": "Missing data"}), 400

    previous_hash = blockchain[-1]["hash"] if blockchain else "0"

    block = {
        "index": len(blockchain) + 1,
        "student_id": student_id,
        "course_id": course_id,
        "file_hash": file_hash,
        "timestamp": str(datetime.now()),
        "previous_hash": previous_hash
    }

    block_string = json.dumps(block, sort_keys=True).encode()
    block["hash"] = hashlib.sha256(block_string).hexdigest()

    blockchain.append(block)

    with open(FILE_NAME, "w") as f:
        json.dump(blockchain, f, indent=4)

    return jsonify(block)

@app.route('/chain', methods=['GET'])
def get_chain():
    return jsonify(blockchain)

app.run(port=5001, debug=True)