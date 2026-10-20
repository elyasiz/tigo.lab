"""Compose Blender frame sequences into the website's branded, accessible demo videos.

Requires Pillow and FFmpeg or imageio-ffmpeg. Run after render_3d_demos.py.
"""
from pathlib import Path
import os,sys,json,argparse,subprocess,shutil,time
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'tools/demos3d/products.json').read_text(encoding='utf-8'))
QA=ROOT/'tmp/demo3d-qa';QA.mkdir(exist_ok=True,parents=True)
FONTS={}
PAPER='#fffefa';INK='#23463e'

def font(size,bold=False):
    key=size,bold
    if key not in FONTS:
        folder=Path(os.environ.get('TIGO_FONT_DIR','C:/Windows/Fonts'))
        path=folder/('arialbd.ttf' if bold else 'arial.ttf')
        if not path.exists():path=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf')
        FONTS[key]=ImageFont.truetype(str(path),size)
    return FONTS[key]

def compose(product_id,frame_path,time):
    item=DATA[product_id]
    image=Image.new('RGBA',(960,960),PAPER)
    with Image.open(frame_path) as stage:
        image.alpha_composite(stage.convert('RGBA'),(0,200))
    d=ImageDraw.Draw(image)
    d.text((58,42),'TIGO LAB',font=font(24,True),fill=INK)
    d.rounded_rectangle((628,37,902,78),radius=20,fill='#eaf1e6')
    d.text((647,51),'ANIMASI 3D CARA BERMAIN',font=font(16,True),fill='#50745c')
    size=34 if len(item['name'])<29 else 29
    d.text((58,111),item['name'],font=font(size,True),fill=INK)
    d.text((59,163),item['title'],font=font(23),fill='#6d7b6b')
    step=0 if time<item['breaks'][0] else 1 if time<item['breaks'][1] else 2
    d.rounded_rectangle((58,842,902,907),radius=20,fill='#e8efe5')
    d.ellipse((73,857,107,891),fill='#4a8062')
    d.text((90,873),str(step+1),font=font(18,True),fill=PAPER,anchor='mm')
    d.text((120,874),item['steps'][step],font=font(22,True),fill=INK,anchor='lm')
    d.text((60,930),'Model 3D dibuat berdasarkan foto katalog',font=font(16),fill='#7a8478')
    for i in range(3):d.rounded_rectangle((758+i*49,930,793+i*49,935),radius=3,fill='#4e8362' if i<=step else '#d5dfce')
    return image.convert('RGB')

def get_ffmpeg():
    if os.environ.get('FFMPEG_BIN'):return os.environ['FFMPEG_BIN']
    if shutil.which('ffmpeg'):return shutil.which('ffmpeg')
    helper=ROOT/'../../tmp/video-tools'
    if helper.exists():sys.path.insert(0,str(helper.resolve()))
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def export(product_id,folder):
    item=DATA[product_id];dest=ROOT/f'dist/assets/videos/{item["slug"]}-3d.mp4'
    frames=[folder/f'frame-{i:04}.png' for i in range(1,241)]
    marker=json.loads((folder/'complete.json').read_text())
    if marker.get('preview',True) or marker.get('rendering',False):raise RuntimeError(f'{product_id}: render is still in progress')
    if not all(p.exists() for p in frames):raise RuntimeError(f'{product_id}: render is incomplete')
    ffmpeg=get_ffmpeg()
    cmd=[ffmpeg,'-hide_banner','-y','-f','rawvideo','-pix_fmt','rgb24','-s','960x960','-r','24','-i','pipe:0','-an',
         '-vf','scale=out_color_matrix=bt709:out_range=tv','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
         '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',str(dest)]
    with (QA/f'{product_id}-encode.log').open('w',encoding='utf-8') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for i,path in enumerate(frames):proc.stdin.write(compose(product_id,path,i/24).tobytes())
        proc.stdin.close()
        if proc.wait():raise RuntimeError((QA/f'{product_id}-encode.log').read_text())
    poster=ROOT/f'dist/assets/{item["slug"]}-3d-poster.webp'
    compose(product_id,frames[211],211/24).save(poster,'WEBP',quality=88)
    result=subprocess.run([ffmpeg,'-hide_banner','-i',str(dest),'-f','null','-'],capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stderr)
    print(f'{product_id} 3D export: {dest.stat().st_size:,} bytes; 240 frames; decode OK',flush=True)

def update_manifest(keys):
    file=ROOT/'dist/demos.js';source=file.read_text(encoding='utf-8')
    data=json.loads(source[source.index('{'):source.rindex('}')+1])
    for key in keys:
        item=DATA[key]
        data[key].update(video=f'assets/videos/{item["slug"]}-3d.mp4',poster=f'assets/{item["slug"]}-3d-poster.webp',
                         note='Ilustrasi cara bermain dengan model 3D berdasarkan foto katalog.')
    file.write_text("'use strict';\nconst productDemos = "+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--all',action='store_true');parser.add_argument('--watch',action='store_true');parser.add_argument('--product',choices=DATA);parser.add_argument('--frames',default=str(ROOT/'tmp/render3d'))
    args=parser.parse_args();keys=[args.product] if args.product else list(DATA)
    if args.preview:
        sheet=Image.new('RGB',(1200,1200),PAPER)
        for i,key in enumerate(keys):
            im=compose(key,Path(args.frames)/key/'preview.png',8.8);im.save(QA/f'{key}-preview.jpg',quality=95)
            sheet.paste(im.resize((400,400)),((i%3)*400,(i//3)*400))
        sheet.save(QA/'all-products-3d.jpg',quality=95)
        print(QA/'all-products-3d.jpg',flush=True)
    else:
        deadline=time.monotonic()+1800
        for key in keys:
            folder=Path(args.frames)/key
            if args.watch:
                print(f'Waiting for {key} render...',flush=True)
                while True:
                    marker=folder/'complete.json'
                    try:ready=not json.loads(marker.read_text()).get('preview',True) and (folder/'frame-0240.png').exists()
                    except (FileNotFoundError,json.JSONDecodeError):ready=False
                    if ready:break
                    if time.monotonic()>deadline:raise RuntimeError('Render did not complete within 30 minutes')
                    time.sleep(2)
                target=ROOT/f'dist/assets/videos/{DATA[key]["slug"]}-3d.mp4'
                if target.exists() and target.stat().st_mtime>marker.stat().st_mtime:
                    print(f'{key}: existing 3D export is current',flush=True);continue
            export(key,folder)
        update_manifest(keys)
