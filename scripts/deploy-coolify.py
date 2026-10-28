#!/usr/bin/env python3
import json
import os
import sys
from typing import Any, cast
import urllib.request
import urllib.error

TOKEN = os.environ.get("COOLIFY_TOKEN", "")
BASE_URL = "http://localhost:8000/api/v1"

if not TOKEN:
    print("Error: COOLIFY_TOKEN environment variable is not set.")
    sys.exit(1)

def req(endpoint: str, data: Any = None, method: str | None = None) -> Any:
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    r = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
            return {"error_status": e.code, "error": parsed}
        except Exception:
            return {"error_status": e.code, "error": body}

def parse_env_file(filepath: str) -> dict[str, str]:
    envs: dict[str, str] = {}
    if not os.path.exists(filepath):
        return envs
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                if k:
                    envs[k] = v
    return envs

def main() -> None:
    print("[1/5] Checking Coolify API status...")
    servers: Any = req("/servers")
    if isinstance(servers, dict) and servers.get("error_status"):
        print("API Error:", servers)
        sys.exit(1)
    
    if not isinstance(servers, list) or len(servers) == 0:
        print("No servers found in Coolify.")
        sys.exit(1)

    first_server = cast(dict[str, Any], servers[0])
    server_uuid = str(first_server["uuid"])
    print(f"Server found: {first_server.get('name')} ({server_uuid})")

    print("[2/5] Checking projects...")
    projects: Any = req("/projects")
    project_uuid = ""
    if isinstance(projects, list):
        for p in projects:
            if isinstance(p, dict) and "genichiro" in str(p.get("name", "")).lower():
                project_uuid = str(p["uuid"])
                print(f"Targeting project: {p.get('name')} ({project_uuid})")
                break
        if not project_uuid and len(projects) > 0:
            first_project = cast(dict[str, Any], projects[0])
            project_uuid = str(first_project["uuid"])
    if not project_uuid:
        print("No projects found. Creating default project...")
        proj_res: Any = req("/projects", {"name": "Genichiro Projects", "description": "AI Worker Team Projects"}, method="POST")
        project_uuid = str(proj_res.get("uuid")) if isinstance(proj_res, dict) else ""
    print(f"Project UUID: {project_uuid}")

    env_name = "production"

    print("[3/5] Creating application from public Git repository...")
    app_payload = {
        "project_uuid": project_uuid,
        "server_uuid": server_uuid,
        "environment_name": env_name,
        "git_repository": "https://github.com/ebinugraha/ai-worker-team",
        "git_branch": "main",
        "build_pack": "nixpacks",
        "ports_exposes": "3000",
        "domains": "http://genichiro-ai-team.my.id",
        "name": "Genichiro AI Team",
        "description": "Genichiro Autonomous AI Workers",
    }
    app_res: Any = req("/applications/public", app_payload, method="POST")
    app_uuid = ""
    if isinstance(app_res, dict) and "error_status" in app_res:
        print("Error creating application:", app_res)
        apps_data: Any = req("/applications")
        matching: list[dict[str, Any]] = []
        if isinstance(apps_data, list):
            for a in apps_data:
                if isinstance(a, dict) and "ai-worker-team" in str(a.get("git_repository", "")):
                    matching.append(a)
        if matching:
            app_uuid = str(matching[0]["uuid"])
            print(f"Using existing application UUID: {app_uuid}")
        else:
            sys.exit(1)
    elif isinstance(app_res, dict) and "uuid" in app_res:
        app_uuid = str(app_res["uuid"])
        print(f"Application created successfully! UUID: {app_uuid}")
    else:
        print("Unexpected response when creating application:", app_res)
        sys.exit(1)

    print("[4/5] Syncing environment variables from .env.local...")
    envs = parse_env_file(".env.local")
    for k, v in envs.items():
        print(f"Setting {k}...")
        env_payload = {
            "key": k,
            "value": v,
            "is_build_time": k.startswith("NEXT_PUBLIC_"),
        }
        res_env: Any = req(f"/applications/{app_uuid}/envs", env_payload, method="POST")
        if isinstance(res_env, dict) and "error_status" in res_env:
            req(f"/applications/{app_uuid}/envs", env_payload, method="PATCH")

    print("[5/5] Triggering deployment...")
    deploy_res: Any = req(f"/deploy?uuid={app_uuid}", method="POST")
    print("Deployment triggered successfully:", deploy_res)
    print("\n✅ Deployment initiated on http://genichiro-ai-team.my.id !")

if __name__ == "__main__":
    main()
