from flask import Flask, request, render_template
import sqlite3

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def login():
    message = ""

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        conn = sqlite3.connect("database.db")
        c = conn.cursor()

        # 🚨 VULNERABLE QUERY (INTENTIONAL)
        query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"

        try:
            c.execute(query)
            result = c.fetchone()

            if result:
                message = f"Welcome {result[1]}! Your password is: {result[2]}"
            else:
                message = "Invalid credentials."

        except:
            message = "Database error."

        conn.close()

    return render_template("login.html", message=message)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
