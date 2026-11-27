"""
PeopleCore - Project Distribution Archive Generator
Creates PeopleCore_Complete_Project.zip containing full source code,
documentation, tests, seed data, and configuration files.
Excludes node_modules, virtual environments, caches, and build artifacts.
"""

import os
import zipfile

def create_archive(output_filename="PeopleCore_Complete_Project.zip"):
    base_dir = os.path.abspath(".")
    exclude_dirs = {
        "node_modules",
        ".next",
        ".git",
        "__pycache__",
        ".pytest_cache",
        "dist",
        "build",
        ".nyc_output",
        "coverage",
        "venv",
        ".venv"
    }
    exclude_files = {
        output_filename,
        ".env",
        ".env.local"
    }

    print(f"Creating project distribution archive: {output_filename}...")
    file_count = 0

    with zipfile.ZipFile(output_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith(".git")]

            for file in files:
                if file in exclude_files or file.endswith(".pyc") or file.endswith(".log"):
                    continue

                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, base_dir)
                zipf.write(abs_path, rel_path)
                file_count += 1

    size_mb = os.path.getsize(output_filename) / (1024 * 1024)
    print(f"✅ Created {output_filename}: {file_count} files archived ({size_mb:.2f} MB)")

if __name__ == "__main__":
    create_archive()
