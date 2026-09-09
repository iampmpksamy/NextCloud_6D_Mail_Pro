#!/usr/bin/env python3
"""Create a deterministic, allowlisted app archive; never deploy it."""
import gzip
import hashlib
import io
from pathlib import Path
import tarfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
version = ET.parse(root / 'appinfo/info.xml').findtext('version')
files = [p for folder in ('appinfo', 'lib', 'templates', 'css', 'img', 'js', 'docs')
         for p in sorted((root / folder).rglob('*')) if p.is_file()]
files += [root / name for name in ('LICENSE', 'README.md', 'CHANGELOG.md', 'composer.json',
                                 'ARCHITECTURE.md', 'TODO.md', 'INSTALLATION.md', 'SUPPORT.md')]
output = root / 'build'
output.mkdir(exist_ok=True)
archive = output / f'sixd_mail_pro-{version}.tar.gz'
buffer = io.BytesIO()
with tarfile.open(fileobj=buffer, mode='w', format=tarfile.USTAR_FORMAT) as tar:
    for path in sorted(files):
        if path.is_symlink():
            raise ValueError(f'Symlinks cannot be packaged: {path}')
        data = path.read_bytes()
        info = tarfile.TarInfo('sixd_mail_pro/' + path.relative_to(root).as_posix())
        info.size = len(data)
        info.mode = 0o644
        info.mtime = 0
        tar.addfile(info, io.BytesIO(data))
with archive.open('wb') as stream:
    with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0) as zipped:
        zipped.write(buffer.getvalue())
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(archive.suffix + '.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive.name}: {len(files)} files, sha256 {digest}')
