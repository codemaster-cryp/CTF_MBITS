import socket
import random

HOST = "0.0.0.0"
PORT = 6000
FLAG = "mbits{elliots_mind_is_root}"

def to_bin8(n):
    return format(n, '08b')

def handle_client(conn, addr):
    conn.settimeout(120)

    num1 = random.randint(0, 255)
    num2 = random.randint(0, 255)

    bin1 = to_bin8(num1)
    bin2 = to_bin8(num2)

    conn.sendall(b"Welcome to BinHexa Redux!\n")
    conn.sendall(f"Binary Number 1: {bin1}\n".encode())
    conn.sendall(f"Binary Number 2: {bin2}\n\n".encode())

    operations = [
        ("<<", lambda: to_bin8((num1 << 1) & 0xFF)),
        ("|", lambda: to_bin8(num1 | num2)),
        ("+", lambda: format(num1 + num2, 'b')),
        ("*", lambda: format(num1 * num2, 'b')),
        (">>", lambda: to_bin8(num2 >> 1)),
        ("&", lambda: to_bin8(num1 & num2)),
    ]

    for i, (op, func) in enumerate(operations, start=1):
        conn.sendall(f"Question {i}/6:\n".encode())
        conn.sendall(f"Operation: '{op}'\n".encode())
        conn.sendall(b"Enter binary result: ")

        answer = conn.recv(1024).strip().decode()

        correct = func()

        if answer != correct:
            conn.sendall(b"Incorrect answer! Connection closing.\n")
            conn.close()
            return

        conn.sendall(b"Correct!\n\n")

        if i == 6:
            conn.sendall(b"Enter the result in hexadecimal: ")
            hex_answer = conn.recv(1024).strip().decode()
            correct_hex = format(int(correct, 2), 'x')

            if hex_answer.lower() != correct_hex:
                conn.sendall(b"Incorrect hex answer! Connection closing.\n")
                conn.close()
                return

            conn.sendall(f"\nCongratulations! Here is your flag:\n{FLAG}\n".encode())
            conn.close()
            return

def start():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, PORT))
        s.listen()
        print("BinHexa server running on port 6000...")
        while True:
            conn, addr = s.accept()
            handle_client(conn, addr)

if __name__ == "__main__":
    start()
