import sys

# Ensure UTF-8 output on Windows consoles to prevent cp1252 charmap encoding crash
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import config

def main():
    config.validate_server_startup()
    try:
        import uvicorn
        print(f"🚀 Khởi chạy VISTA Python LLM Service (FastAPI + Uvicorn) trên http://{config.HOST}:{config.PORT}")
        print(f"🤖 LLM Model: {config.LLM_MODEL}")
        uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=config.DEV)
    except ImportError:
        print("💡 Uvicorn/FastAPI chưa có sẵn, tự động chuyển sang Python Standalone HTTP Server chuẩn...")
        from standalone_server import run_standalone_server
        run_standalone_server()

if __name__ == "__main__":
    main()
