import socket
import hashlib

HOST = "0.0.0.0"
PORT = 5000

passwords = [
    "laptop",
    "mbits111",
    "qwerty123"
]

hashes = [
    hashlib.md5(passwords[0].encode()).hexdigest(),
    hashlib.sha1(passwords[1].encode()).hexdigest(),
    hashlib.sha256(passwords[2].encode()).hexdigest()
]

flag = "mbits{Darlene @lderson}"

def handle_client(conn):
    conn.sendall(b"\n=== HashCrack Challenge ===\n")
    conn.sendall(b"Crack all 3 hashes in order.\n\n")

    for i in range(3):
        question = f"Hash {i+1}: {hashes[i]}\nEnter plaintext: "
        conn.sendall(question.encode())

        answer = conn.recv(1024).decode().strip()

        if answer != passwords[i]:
            conn.sendall(b"\nWrong answer. Bye.\n")
            conn.close()
            return
        else:
            conn.sendall(b"Correct!\n\n")

    conn.sendall(f"\nCongratulations!\nFLAG: {flag}\n".encode())
    conn.close()

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Server running on port {PORT}")

    while True:
        conn, addr = s.accept()
        handle_client(conn)
