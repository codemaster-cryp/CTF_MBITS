cipher = "iodj{fdhvdu_flskhu_lv_qrw_vhfxuh}"

def caesar_decrypt(text, shift):
    result = ""
    for c in text:
        if c.isalpha():
            base = ord('a')
            result += chr((ord(c)-base-shift)%26+base)
        else:
            result += c
    return result

print(caesar_decrypt(cipher, 3))
