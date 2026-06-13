#!/usr/bin/env python3
"""idmlutil.py — unpack and pack Adobe InDesign IDML files.

An IDML file is a ZIP package (an OCF/EPUB-style container). The only special
rule when re-packing is that the ``mimetype`` entry must be:

  1. the FIRST entry in the archive, and
  2. STORED (uncompressed), holding exactly
     ``application/vnd.adobe.indesign-idml-package``.

InDesign rejects packages that violate this (the magic bytes are read from a
fixed offset), so a plain ``zip -r`` of the folder will NOT produce a valid
IDML. This script handles it correctly.

Everything else in the package is stored DEFLATED. Pure standard library —
no third-party packages required.

Usage
-----
    python3 idmlutil.py unpack <file.idml> [dest_dir]
    python3 idmlutil.py pack   <out.idml>  [src_dir]

``dest_dir`` / ``src_dir`` default to ``./workspace``. ``unpack`` clears the
destination first so each run is clean.
"""

import os
import shutil
import sys
import zipfile

MIMETYPE_NAME = "mimetype"
MIMETYPE_VALUE = b"application/vnd.adobe.indesign-idml-package"
DEFAULT_WORKSPACE = "workspace"


def unpack(idml_path, dest_dir):
    if not os.path.isfile(idml_path):
        sys.exit("error: not a file: %s" % idml_path)

    # Start from a clean destination so stale entries don't linger.
    if os.path.isdir(dest_dir):
        shutil.rmtree(dest_dir)
    os.makedirs(dest_dir, exist_ok=True)

    dest_root = os.path.abspath(dest_dir)
    count = 0
    with zipfile.ZipFile(idml_path, "r") as zf:
        for info in zf.infolist():
            # Guard against path-traversal ("zip slip").
            target = os.path.abspath(os.path.join(dest_root, info.filename))
            if not (target == dest_root or target.startswith(dest_root + os.sep)):
                sys.exit("error: unsafe path in archive: %s" % info.filename)
            if info.is_dir():
                os.makedirs(target, exist_ok=True)
                continue
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)
            count += 1
    print("unpacked %d files -> %s" % (count, dest_root))


def _iter_files(base_dir):
    """Yield (absolute_path, archive_name) for every file under base_dir,
    excluding the mimetype (written separately) and macOS .DS_Store cruft.
    Archive names always use forward slashes."""
    base_dir = os.path.abspath(base_dir)
    for root, _dirs, files in os.walk(base_dir):
        for name in sorted(files):
            if name == ".DS_Store":
                continue
            abs_path = os.path.join(root, name)
            rel = os.path.relpath(abs_path, base_dir)
            arc = rel.replace(os.sep, "/")
            if arc == MIMETYPE_NAME:
                continue
            yield abs_path, arc


def pack(out_path, src_dir):
    if not os.path.isdir(src_dir):
        sys.exit("error: not a directory: %s" % src_dir)

    out_path = os.path.abspath(out_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Prefer the mimetype shipped inside the folder; fall back to the constant.
    mimetype_file = os.path.join(src_dir, MIMETYPE_NAME)
    if os.path.isfile(mimetype_file):
        with open(mimetype_file, "rb") as fh:
            mimetype_bytes = fh.read()
    else:
        mimetype_bytes = MIMETYPE_VALUE

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1) mimetype: must be first and STORED (uncompressed).
        info = zipfile.ZipInfo(MIMETYPE_NAME)
        info.compress_type = zipfile.ZIP_STORED
        zf.writestr(info, mimetype_bytes)

        # 2) everything else, deflated.
        count = 0
        for abs_path, arc in _iter_files(src_dir):
            zf.write(abs_path, arc, compress_type=zipfile.ZIP_DEFLATED)
            count += 1

    print("packed mimetype + %d files -> %s" % (count, out_path))


def main(argv):
    if len(argv) < 2 or argv[1] not in ("unpack", "pack"):
        sys.exit(__doc__)

    cmd = argv[1]
    if cmd == "unpack":
        if len(argv) < 3:
            sys.exit("usage: idmlutil.py unpack <file.idml> [dest_dir]")
        src = argv[2]
        dest = argv[3] if len(argv) > 3 else DEFAULT_WORKSPACE
        unpack(src, dest)
    else:  # pack
        if len(argv) < 3:
            sys.exit("usage: idmlutil.py pack <out.idml> [src_dir]")
        out = argv[2]
        src = argv[3] if len(argv) > 3 else DEFAULT_WORKSPACE
        pack(out, src)


if __name__ == "__main__":
    main(sys.argv)
