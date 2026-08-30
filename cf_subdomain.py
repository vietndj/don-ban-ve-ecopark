#!/usr/bin/env python3
"""
CLOUDFLARE & VERCEL AUTOMATED SUBDOMAIN CREATOR
Tự động tạo subdomain trên Cloudflare và gán vào Vercel 1-Shot
"""

import sys
import os
import json
import argparse
import subprocess

def load_cf_config():
    paths = [
        os.path.expanduser("~/Documents/CODE/cloudflare_credentials.json"),
        os.path.expanduser("~/.gemini/config/cloudflare_credentials.json"),
        os.path.join(os.path.dirname(__file__), "cloudflare_credentials.json")
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {}

config = load_cf_config()
CF_API_TOKEN = config.get("api_token", "")
CF_ZONE_ID = config.get("zones", {}).get("fedu.vn", {}).get("zone_id", "9c17d0cd27fc0acd753413b39be370a6")
VERCEL_SCOPE = "viet-s-projects1"

def create_subdomain(subdomain, target="cname.vercel-dns.com", domain="fedu.vn", vercel_project=None):
    if not CF_API_TOKEN:
        print("❌ Không tìm thấy Cloudflare API Token trong cloudflare_credentials.json")
        return

    full_domain = f"{subdomain}.{domain}"
    print(f"🚀 [1/3] Đang tạo bản ghi DNS '{full_domain}' trên Cloudflare...")
    
    # 1. Cloudflare CNAME
    cmd_cf = [
        "curl", "-s", "-X", "POST",
        f"https://api.cloudflare.com/client/v4/zones/{CF_ZONE_ID}/dns_records",
        "-H", f"Authorization: Bearer {CF_API_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({
            "type": "CNAME",
            "name": subdomain,
            "content": target,
            "ttl": 1,
            "proxied": False
        })
    ]
    res_cf = subprocess.run(cmd_cf, capture_output=True, text=True)
    try:
        cf_json = json.loads(res_cf.stdout)
        if cf_json.get("success"):
            print(f"✅ [Cloudflare] Đã tạo thành công CNAME: {full_domain} -> {target}")
        else:
            print(f"ℹ️ [Cloudflare] Phản hồi: {cf_json.get('errors') or cf_json.get('messages')}")
    except Exception as e:
        print("CF Parse Error:", e)

    # 2. Vercel Domain Attach
    if vercel_project:
        print(f"🚀 [2/3] Đang gán domain '{full_domain}' vào project '{vercel_project}' trên Vercel...")
        cmd_vc = ["vercel", "domains", "add", full_domain, vercel_project, "--scope", VERCEL_SCOPE]
        subprocess.run(cmd_vc, capture_output=True, text=True)
        
        print(f"🚀 [3/3] Đang xác thực chứng chỉ SSL trên Vercel...")
        cmd_verify = ["vercel", "domains", "verify", full_domain, "--scope", VERCEL_SCOPE]
        subprocess.run(cmd_verify, capture_output=True, text=True)

    print(f"\n🎉 HOÀN TẤT! Truy cập web tại: https://{full_domain}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auto create subdomain on Cloudflare & Vercel")
    parser.add_argument("--sub", required=True, help="Subdomain name (e.g. trada, bds, ai)")
    parser.add_argument("--project", default="tra-da-khao-sat-hoc-vien", help="Vercel project name")
    parser.add_argument("--target", default="cname.vercel-dns.com", help="CNAME target")
    args = parser.parse_args()
    create_subdomain(args.sub, target=args.target, vercel_project=args.project)
