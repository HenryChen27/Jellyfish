"""Build the game/ layout consumed by the existing desktop/mobile launchers."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--version',required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
output=root/'dist'/f'desktop-v{args.version}'
output.mkdir(parents=True,exist_ok=True)
files=[root/'index.html']
files.extend(sorted((root/'js').glob('*.js')))
files.extend(sorted((root/'js').glob('*LICENSE*.txt')))
files.extend(sorted((root/'css').glob('*.css')))
files.extend(sorted(p for p in (root/'assets').rglob('*') if p.is_file()
    and p.suffix.lower() in {'.png','.mp3','.wav','.ttf','.txt','.md'} and p.name!='1.png'))
archive=output/'Jellyfish-game.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in files:z.write(file,'game/'+file.relative_to(root).as_posix())
    z.writestr('package.json',json.dumps({'id':'jellyfish','runtime':'system-webview','version':args.version}))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'game/index.html' in z.namelist()
    assert not any(n.endswith('.mp4') for n in z.namelist())
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
manifest_path=output/'native-desktop-games.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8-sig'))
base=f'https://github.com/HenryChen27/Jellyfish/releases/download/desktop-v{args.version}'
manifest['game']={'version':args.version,'size':archive.stat().st_size,'sha256':sha,'url':base+'/Jellyfish-game.zip'}
for platform,entry in manifest['launchers'].items():
    asset=output/f'GameLauncher-{platform}.zip'
    assert len(asset.read_bytes())==entry['size']
    assert hashlib.sha256(asset.read_bytes()).hexdigest()==entry['sha256']
    # Preserve native executables and platform permissions; update only the
    # external save bridge and package metadata for the new game save API.
    temporary=asset.with_suffix('.updated.zip')
    assert temporary.resolve().is_relative_to(output.resolve())
    with zipfile.ZipFile(asset) as source, zipfile.ZipFile(temporary,'w') as target:
        for info in source.infolist():
            data=source.read(info.filename)
            if info.filename=='safe-exit.js':
                script=data.decode('utf-8')
                script=script.replace("if (!window.JellyfishGame?.safeSaveAndExit)","if (!window.JellyfishGame?.save && !window.JellyfishGame?.safeSaveAndExit)")
                script=script.replace('const result = await window.JellyfishGame.safeSaveAndExit();','const result = window.JellyfishGame.save ? {saved: window.JellyfishGame.save()} : await window.JellyfishGame.safeSaveAndExit();')
                data=script.encode('utf-8')
            if info.filename=='package.json':
                metadata=json.loads(data);metadata['version']=args.version;data=json.dumps(metadata).encode('utf-8')
            target.writestr(info,data)
    temporary.replace(asset)
    entry.update(version=args.version,size=asset.stat().st_size,sha256=hashlib.sha256(asset.read_bytes()).hexdigest())
    entry['url']=base+'/'+asset.name
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(output/'SHA256SUMS.txt').write_text('\n'.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}'
    for p in sorted(output.iterdir()) if p.is_file() and p.name!='SHA256SUMS.txt')+'\n',encoding='utf-8')
print(json.dumps({'package':str(archive),'files':len(files),'size':archive.stat().st_size,'sha256':sha}))
