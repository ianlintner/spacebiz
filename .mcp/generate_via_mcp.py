import json
import os
import select
import subprocess
import time
from pathlib import Path

server_cmd = [
    "/bin/zsh",
    "-lc",
    "exec /Users/ianlintner/Projects/spacebiz/.mcp/image-gen-mcp/start-mcp.sh",
]
p = subprocess.Popen(server_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def send(msg):
    assert p.stdin is not None
    body = json.dumps(msg).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
    p.stdin.write(header + body)
    p.stdin.flush()


def read_exact(n, timeout=30):
    assert p.stdout is not None
    buf = b""
    end = time.time() + timeout
    fd = p.stdout.fileno()
    while len(buf) < n and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, n - len(buf))
        if not chunk:
            break
        buf += chunk
    return buf


def recv(timeout=30):
    assert p.stdout is not None
    end = time.time() + timeout
    data = b""
    fd = p.stdout.fileno()

    while b"\r\n\r\n" not in data and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, 1)
        if not chunk:
            break
        data += chunk

    if b"\r\n\r\n" not in data:
        return None

    header_bytes, rest = data.split(b"\r\n\r\n", 1)
    headers = {}
    for line in header_bytes.decode("ascii", "replace").split("\r\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()

    if "content-length" not in headers:
        return None

    n = int(headers["content-length"])
    body = rest
    if len(body) < n:
        body += read_exact(n - len(body), timeout=timeout)

    if len(body) < n:
        return None

    return json.loads(body[:n].decode("utf-8", "replace"))


result = {"ok": False, "steps": [], "raw": {}}

try:
    send(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "copilot-mcp-test", "version": "1.0.0"},
            },
        }
    )
    init_resp = recv(timeout=20)
    result["raw"]["initialize"] = init_resp
    if not init_resp or "result" not in init_resp:
        raise RuntimeError("initialize failed")
    result["steps"].append("initialize_ok")

    send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

    send({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    tools_resp = recv(timeout=20)
    result["raw"]["tools_list"] = tools_resp
    if not tools_resp or "result" not in tools_resp:
        raise RuntimeError("tools/list failed")
    result["steps"].append("tools_list_ok")

    send(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "generate_image",
                "arguments": {
                    "prompt": "Bust portrait sprite for a sci-fi freight advisor, friendly but sharp strategist, pixel-art inspired but clean modern game portrait, 3/4 view, teal and amber rim lighting, dark space station backdrop, high contrast, expressive face, no text, transparent background",
                    "size": "1024x1024",
                    "quality": "high",
                    "style": "vivid",
                    "output_format": "png",
                    "background": "transparent",
                },
            },
        }
    )

    gen_resp = recv(timeout=120)
    result["raw"]["generate_image"] = gen_resp
    if not gen_resp or "result" not in gen_resp:
        raise RuntimeError("generate_image failed")

    payload = None
    content = gen_resp.get("result", {}).get("content")
    if isinstance(content, list) and content:
        text_items = [
            c.get("text")
            for c in content
            if isinstance(c, dict) and c.get("type") == "text"
        ]
        if text_items:
            txt = text_items[0]
            try:
                payload = json.loads(txt)
            except Exception:
                payload = {"raw_text": txt}

    if payload is None:
        payload = gen_resp.get("result", {})

    result["generated_payload"] = payload
    image_url = payload.get("image_url") if isinstance(payload, dict) else None
    result["image_url"] = image_url

    out_path = Path(
        "/Users/ianlintner/Projects/spacebiz/public/concepts/assistant/advisor-mcp-test.png"
    )

    if image_url and image_url.startswith("file://"):
        src = Path(image_url.replace("file://", ""))
        if src.exists():
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(src.read_bytes())
            result["saved_file"] = str(out_path)
            result["steps"].append("saved_from_file_url")
        else:
            result["steps"].append("file_url_missing")
    else:
        result["steps"].append("no_file_url_returned")

    result["ok"] = "saved_file" in result

except Exception as e:
    result["error"] = repr(e)
finally:
    try:
        p.terminate()
        p.wait(timeout=5)
    except Exception:
        p.kill()

Path("/tmp/mcp_generate_result.json").write_text(
    json.dumps(result, indent=2), encoding="utf-8"
)
print("WROTE_RESULT /tmp/mcp_generate_result.json")
print("OK", result.get("ok"))
if result.get("saved_file"):
    print("SAVED_FILE", result["saved_file"])
