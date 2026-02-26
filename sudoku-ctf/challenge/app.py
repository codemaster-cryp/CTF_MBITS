from flask import Flask, render_template, request, jsonify, session
import random

app = Flask(__name__)
app.secret_key = "super_secret_key_change_me"

FLAG = "MBITS{hello friend}"

base_board = [
[5,3,4,6,7,8,9,1,2],
[6,7,2,1,9,5,3,4,8],
[1,9,8,3,4,2,5,6,7],
[8,5,9,7,6,1,4,2,3],
[4,2,6,8,5,3,7,9,1],
[7,1,3,9,2,4,8,5,6],
[9,6,1,5,3,7,2,8,4],
[2,8,7,4,1,9,6,3,5],
[3,4,5,2,8,6,1,7,9]
]

mask = [
[1,1,0,0,1,0,0,1,1],
[1,0,0,1,1,1,0,0,1],
[0,1,1,0,0,0,1,1,0],
[0,0,0,1,1,1,0,0,0],
[1,1,0,1,0,1,0,1,1],
[0,0,0,1,1,1,0,0,0],
[0,1,1,0,0,0,1,1,0],
[1,0,0,1,1,1,0,0,1],
[1,1,0,0,1,0,0,1,1]
]

def generate_board():
    digits = list(range(1,10))
    random.shuffle(digits)

    solved = []
    for i in range(9):
        row = []
        for j in range(9):
            row.append(digits[base_board[i][j] - 1])
        solved.append(row)

    puzzle = []
    for i in range(9):
        row = []
        for j in range(9):
            if mask[i][j] == 1:
                row.append(solved[i][j])
            else:
                row.append(0)
        puzzle.append(row)

    return solved, puzzle


@app.route("/")
def index():
    solved, puzzle = generate_board()
    session["solution"] = solved
    return render_template("index.html", puzzle=puzzle)


@app.route("/submit", methods=["POST"])
def submit():
    data = request.get_json()
    user_grid = data.get("grid")
    solution = session.get("solution")

    if not solution:
        return jsonify({"result": "Session expired"})

    for i in range(9):
        for j in range(9):
            if int(user_grid[i][j]) != solution[i][j]:
                return jsonify({"result": "Wrong!"})

    return jsonify({"flag": FLAG})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
