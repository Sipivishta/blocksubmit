from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

FILE_NAME = "blockchain_5001.json"

if os.path.exists(FILE_NAME):
    with open(FILE_NAME) as f:
        blockchain = json.load(f)
else:
    blockchain = []


def save():
    with open(FILE_NAME, "w") as f:
        json.dump(blockchain, f, indent=4)


@app.route("/")
def home():
    return "Node2 is running ✅"


@app.route("/receive_block", methods=["POST"])
def receive_block():
    block = request.json
    blockchain.append(block)
    save()
    return jsonify({"message": "Block added to node2"})


@app.route("/chain", methods=["GET"])
def get_chain():
    return jsonify({"chain": blockchain})


if __name__ == "__main__":
    app.run(port=5001, debug=True)