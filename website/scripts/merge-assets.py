
from pathlib import Path
import shutil

website = Path(__file__).resolve().parent.parent
root = website.parent
target = website / "dist" / "client"

if not target.is_dir():
    raise SystemExit("错误：请先执行 Vinext 构建")

extensions = {
    ".html", ".js", ".css", ".svg", ".png",
    ".jpg", ".jpeg", ".webp", ".mp4", ".json"
}

copied = 0
skipped = 0

for source in root.iterdir():
    if not source.is_file() or source.suffix.lower() not in extensions:
        continue

    destination = target / source.name
    if destination.exists():
        skipped += 1
        continue

    shutil.copy2(source, destination)
    copied += 1

source_assets = root / "assets"
target_assets = target / "assets"
asset_copied = 0
asset_skipped = 0

if source_assets.is_dir():
    for source in source_assets.rglob("*"):
        if not source.is_file():
            continue

        destination = target_assets / source.relative_to(source_assets)
        if destination.exists():
            asset_skipped += 1
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        asset_copied += 1

print("业务文件新增：", copied)
print("同名文件保留：", skipped)
print("资源新增：", asset_copied)
print("资源同名保留：", asset_skipped)

for name in ["index.html", "login.html", "qr_login.html", "admins.html"]:
    print(name, "OK" if (target / name).is_file() else "缺失")
    
