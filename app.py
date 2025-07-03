import uuid
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

directory = os.getcwd()


@app.route('/')
def home():
    return render_template('TEMS.html')


@app.route('/TAP')
def TPA():
    return render_template('index.html')


@app.route('/nonprod')
def nonprod():
    return render_template('nonprod.html')


@app.route('/get_new_data')
def get_new_data():
    try:
        with open('data.json') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Error decoding JSON"}), 500


@app.route('/get_pinned_data', methods=['GET'])
def get_pinned_data():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"Error": "UID is required"}), 400
    try:
        print(os.path.join(directory, f'pins\{uid}.json'))
        # print(directory)
        with open(os.path.join(directory, f'pins\{uid}.json')) as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"Error": "File not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"Error": "Error decoding JSON"}), 500


@app.route('/update_pinned_data', methods=['POST'])
def update_pinned_data():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"Error": "UID is required"}), 400
    try:
        data = request.json
        pins_list = data.get('pins', [])
        file_path = os.path.join(directory, f'pins/{uid}.json')

        # print(f"File path: {file_path}")

        if not os.path.exists(file_path):
            return jsonify({"Error": "File not found"}), 404

        with open(file_path, 'r') as f:
            resp = json.load(f)

        resp["pins"] = pins_list
        resp["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with open(file_path, 'w') as f:
            f.write(json.dumps(resp, indent=4))

        return jsonify(resp)

    except FileNotFoundError:
        return jsonify({"Error": "File not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"Error": "Error decoding JSON"}), 500


@app.route('/generate_unique_id', methods=['GET'])
def generate_unique_id():
    unique_id = str(uuid.uuid4())
    file_path = os.path.join(directory, f'pins/{unique_id}.json')

    # filename = os.path.join(directory, f'/pins/{unique_id}.json')
    resp = {"timestamp": datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"), "pins": []}
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            f.write(json.dumps(resp, indent=2))
        resp["status"] = True
        resp["token"] = unique_id
        return jsonify(resp)


@app.route("/retrieve_pins", methods=["GET"])
def retrieve_pins():
    unique_id = request.args.get('uid')
    if not unique_id:
        return jsonify({"Error": "UID is required"}), 400
    try:
        file_path = os.path.join(directory, f'pins/{unique_id}.json')
        print(file_path)
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Error decoding JSON"}), 500

@app.route('/get_timestamp', methods=['GET'])
def get_timestamp():
    current_timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    return jsonify({"timestamp": current_timestamp, "refresh": False})


if __name__ == '__main__':
    app.run(debug=True, port=3000)
