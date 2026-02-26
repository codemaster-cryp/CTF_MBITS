from flask import Flask, render_template, request, jsonify
import time

app = Flask(__name__)

# Store session start times (simple memory storage)
sessions = {}

FLAG = "Mbits{leader_of_the_dark_army}"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/start", methods=["POST"])
def start():
    session_id = request.remote_addr
    sessions[session_id] = time.time()
    return jsonify({"status": "started"})

@app.route("/flag", methods=["POST"])
def flag():
    session_id = request.remote_addr

    if session_id not in sessions:
        return jsonify({"error": "Session not started"}), 403

    elapsed = time.time() - sessions[session_id]

    if elapsed >= 30:
        return jsonify({"flag": FLAG})
    else:
        sessions[session_id] = time.time()
        return jsonify({"error": "You moved. Timer reset."}), 403

if __name__ == "__main__":
    app.run(debug=False)
