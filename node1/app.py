from flask import Flask, request, jsonify
import hashlib
import json
from datetime import datetime

app = Flask(__name__)

BLOCKCHAIN_FILE = "blockchain_5000.json"


def load_chain():
    try:
        with open(BLOCKCHAIN_FILE, "r") as f:
            return json.load(f)
    except:
        return []


def save_chain(chain):
    with open(BLOCKCHAIN_FILE, "w") as f:
        json.dump(chain, f, indent=4)


@app.route("/")
def home():
    return "Node1 running ✅"


@app.route("/add_block", methods=["POST"])
def add_block():
    data = request.json

    chain = load_chain()
    previous_hash = chain[-1]["hash"] if chain else "0"

    block = {
        "index": len(chain) + 1,
        "timestamp": str(datetime.now()),
        "student_id": data["student_id"],
        "course_id": data["course_id"],
        "file_hash": data["file_hash"],
        "version": data.get("version", 1),
        "previous_hash": previous_hash
    }

    block_string = json.dumps(block, sort_keys=True)
    block["hash"] = hashlib.sha256(block_string.encode()).hexdigest()

    chain.append(block)
    save_chain(chain)

    return jsonify({"message": "Block added"})


@app.route("/chain", methods=["GET"])
def get_chain():
    chain = load_chain()
    return jsonify({"chain": chain, "length": len(chain)})


if __name__ == "__main__":
    app.run(port=5000, debug=True)