import os
import json

base_dir = r"c:\Users\s0307\Desktop\code\neoncard-main"
folders = ["pic", "hao_pic", "item_pic", "race_pic"]
image_extensions = (".png", ".jpg", ".jpeg", ".webp")

image_list = []

for folder in folders:
    folder_path = os.path.join(base_dir, folder)
    if os.path.exists(folder_path):
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.lower().endswith(image_extensions):
                    rel_path = os.path.relpath(os.path.join(root, file), base_dir)
                    # Replace backslashes with forward slashes
                    image_list.append(rel_path.replace("\\", "/"))

manifest_content = f"""/**
 * Neon Card Game - Resource Manifest
 * This file lists all assets that should be preloaded before entering the game.
 * Automatically generated.
 */

const RESOURCE_MANIFEST = {{
    images: {json.dumps(image_list, indent=8, ensure_ascii=False)}
}};

// Export for global access
window.RESOURCE_MANIFEST = RESOURCE_MANIFEST;
"""

with open(os.path.join(base_dir, "js", "core", "resourceManifest.js"), "w", encoding="utf-8") as f:
    f.write(manifest_content)

print(f"Updated resourceManifest.js with {len(image_list)} images.")
