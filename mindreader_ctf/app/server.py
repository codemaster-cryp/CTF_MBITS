import socket
import random

HOST = "0.0.0.0"
PORT = 5000
FLAG = "mbits{this_flag_is_elliot}"

def handle_client(conn):
    secret = random.randint(1, 1000)
    attempts = 10

    conn.sendall(b"Welcome to MindReader!\n")
    conn.sendall(b"I'm thinking of a number between 1 and 1000.\n")
    conn.sendall(b"You have 10 attempts.\n\n")

    while attempts > 0:
        conn.sendall(f"Attempts left: {attempts}\n".encode())
        conn.sendall(b"Enter your guess: ")

        data = conn.recv(1024)
        if not data:
            break

        try:
            guess = int(data.strip())
        except:
            conn.sendall(b"Invalid input. Enter a number.\n\n")
            continue

        attempts -= 1

        if guess == secret:
            conn.sendall(f"\nCorrect! Here is your flag:\n{FLAG}\n".encode())
            conn.close()
            return
        elif guess < secret:
            conn.sendall(b"Too Low\n\n")
        else:
            conn.sendall(b"Too High\n\n")

    conn.sendall(b"\nOut of attempts. Better luck next time.\n")
    conn.close()

def start_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, PORT))
        s.listen()
        print("Server running on port 5000...")
        while True:
            conn, addr = s.accept()
            handle_client(conn)

if __name__ == "__main__":
    start_server()

