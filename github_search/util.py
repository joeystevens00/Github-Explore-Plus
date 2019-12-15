def bdecode(b: bytes) -> str:
    if isinstance(b, bytes):
        return b.decode('utf-8')

def sencode(s: str) -> bytes:
    if isinstance(s, str):
        return s.encode('utf-8')
