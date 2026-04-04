from flask import Flask, request, jsonify
import hashlib
import json
from datetime import datetime
import requests

app = Flask(__name__)

BLOCKCHAIN_FILE = "blockchain_5000.json"
OTHER_NODE = "http://127.0.0.1:5001"


def load_chain():
    try:
        with open(BLOCKCHAIN_FILE, "r") as f:
            return json.load(f)
    except:
        return []


def save_chain(chain):
    with open(BLOCKCHAIN_FILE, "w") as f:
        json.dump(chain, f, indent=4)


def is_chain_valid(chain):
    for i in range(1, len(chain)):
        current = chain[i]
        prev = chain[i - 1]

        if current["previous_hash"] != prev["hash"]:
            return False

        block_copy = current.copy()
        hash_value = block_copy.pop("hash")

        if hashlib.sha256(json.dumps(block_copy, sort_keys=True).encode()).hexdigest() != hash_value:
            return False

    return True


@app.route("/")
def home():
    return "Node1 is running ✅"


@app.route("/add_block", methods=["POST"])
def add_block():
    data = request.json

    chain = load_chain()
    prev_hash = chain[-1]["hash"] if chain else "0"

    block = {
        "index": len(chain) + 1,
        "timestamp": str(datetime.now()),
        "student_id": data["student_id"],
        "course_id": data["course_id"],
        "file_hash": data["file_hash"],
        "version": data["version"],
        "previous_hash": prev_hash
    }

    block_string = json.dumps(block, sort_keys=True)
    block["hash"] = hashlib.sha256(block_string.encode()).hexdigest()

    chain.append(block)
    save_chain(chain)

    try:
        requests.post(f"{OTHER_NODE}/receive_block", json=block)
    except:
        pass

    return jsonify({"message": "Block added"})


@app.route("/receive_block", methods=["POST"])
def receive_block():
    block = request.json
    chain = load_chain()

    chain.append(block)
    save_chain(chain)

    return jsonify({"message": "Block received"})


@app.route("/sync", methods=["GET"])
def sync():
    chain = load_chain()

    try:
        res = requests.get(f"{OTHER_NODE}/chain")
        other_chain = res.json()["chain"]

        if len(other_chain) > len(chain) and is_chain_valid(other_chain):
            save_chain(other_chain)
            return jsonify({"message": "Chain replaced"})
    except:
        pass

    return jsonify({"message": "Already up-to-date"})


@app.route("/chain", methods=["GET"])
def get_chain():
    return jsonify({"chain": load_chain()})


if __name__ == "__main__":
    app.run(port=5000, debug=True)