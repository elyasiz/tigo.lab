"""Compose the ten Blender demos with TIGO colors and fonts, using Pillow and FFmpeg."""
from pathlib import Path
from functools import lru_cache
import os,sys,json,argparse,subprocess,shutil,time,re,math
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'tools/demos3d/products.json').read_text(encoding='utf-8'))
QA=ROOT/'tmp/demo3d-qa';QA.mkdir(exist_ok=True,parents=True)
CSS=(ROOT/'dist/styles.css').read_text(encoding='utf-8')
TOKENS=dict(re.findall(r'--([\w-]+):\s*(#[a-fA-F0-9]{3,8})',re.search(r':root\{([^}]+)\}',CSS).group(1)))
PAPER=TOKENS['paper'];INK=TOKENS['ink'];MUTED=TOKENS['muted']
ACCENTS=[TOKENS['blue'],TOKENS['orange'],TOKENS['yellow']]
FPS=24
LOGO=Image.open(ROOT/'dist/assets/tigo-logo.webp').convert('RGBA')
LOGO.thumbnail((190,60),Image.Resampling.LANCZOS)


@lru_cache(maxsize=64)
def font(size,heading=False,weight=600):
    folder=Path(os.environ.get('TIGO_FONT_DIR',str(ROOT/'dist/assets/fonts')))
    path=folder/('fredoka-latin-variable.woff2' if heading else 'nunito-latin-variable.woff2')
    result=ImageFont.truetype(str(path),size)
    axes=result.get_variation_axes()
    result.set_variation_by_axes([weight if axis['name']==b'Weight' else axis['default'] for axis in axes])
    return result


def fit(text,size,max_width,heading=False,weight=600):
    while size>16 and font(size,heading,weight).getlength(text)>max_width:
        size-=1
    result=font(size,heading,weight)
    if result.getlength(text)>max_width:
        raise ValueError(f'Video text does not fit: {text}')
    return result


def step_at(item,t):
    return 0 if t<item['breaks'][0] else 1 if t<item['breaks'][1] else 2


@lru_cache(maxsize=32)
def template(product_id,step):
    item=DATA[product_id]
    image=Image.new('RGBA',(960,960),PAPER)
    image.alpha_composite(LOGO,(58,33))
    d=ImageDraw.Draw(image)
    d.rounded_rectangle((630,41,902,84),radius=21,fill=TOKENS['soft-blue'])
    d.ellipse((650,58,660,68),fill=TOKENS['blue'])
    d.text((674,63),'CARA BERMAIN 3D',font=font(18,weight=800),fill=TOKENS['blue-ink'],anchor='lm')
    d.text((58,116),item['name'],font=fit(item['name'],44,844,heading=True),fill=INK,anchor='lt')
    d.text((59,172),item['title'],font=fit(item['title'],25,844),fill=MUTED,anchor='lt')
    d.rounded_rectangle((44,842,916,916),radius=22,fill=TOKENS['cream'])
    d.ellipse((62,858,104,900),fill=ACCENTS[step])
    d.text((83,879),str(step+1),font=font(24,weight=900),fill=INK,anchor='mm')
    d.text((122,879),item['steps'][step],font=fit(item['steps'][step],28,765,weight=750),fill=INK,anchor='lm')
    for i in range(3):
        d.rounded_rectangle((758+i*49,934,793+i*49,940),radius=3,
                            fill=ACCENTS[i] if i<=step else TOKENS['line'])
    for i,color in enumerate(ACCENTS):d.rectangle((i*320,954,(i+1)*320,959),fill=color)
    return image


def load_stage(product_id,path,t):
    with Image.open(path) as image:return image.convert('RGBA')


def compose(product_id,frame_path,t):
    stage=load_stage(product_id,frame_path,t)
    image=template(product_id,step_at(DATA[product_id],t)).copy()
    image.alpha_composite(stage,(0,200))
    ImageDraw.Draw(image).rounded_rectangle((59,209,137,215),radius=3,fill=TOKENS['yellow'])
    return image.convert('RGB')


def get_ffmpeg():
    if os.environ.get('FFMPEG_BIN'):return os.environ['FFMPEG_BIN']
    if shutil.which('ffmpeg'):return shutil.which('ffmpeg')
    helper=ROOT/'../../tmp/video-tools'
    if helper.exists():sys.path.insert(0,str(helper.resolve()))
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def paths(product_id):
    slug=DATA[product_id]['slug']
    stem=DATA[product_id].get('video_stem',f'{slug}-3d-play')
    return ROOT/f'dist/assets/videos/{stem}.mp4',ROOT/f'dist/assets/{stem}-poster.webp'


def export(product_id,folder):
    item=DATA[product_id];dest,poster=paths(product_id)
    duration=item.get('duration',10);frame_count=round(duration*FPS)
    frames=[folder/f'frame-{i:04}.png' for i in range(1,frame_count+1)]
    marker=json.loads((folder/'complete.json').read_text())
    if marker.get('preview',True) or marker.get('rendering',False):raise RuntimeError(f'{product_id}: render is still in progress')
    if not all(p.exists() for p in frames):raise RuntimeError(f'{product_id}: render is incomplete')
    ffmpeg=get_ffmpeg()
    temporary=QA/f'{product_id}-brand-export.mp4'
    cmd=[ffmpeg,'-hide_banner','-y','-f','rawvideo','-pix_fmt','rgb24','-s','960x960','-r',str(FPS),'-i','pipe:0','-an',
         '-vf','scale=out_color_matrix=bt709:out_range=tv','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
         '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',str(temporary)]
    with (QA/f'{product_id}-encode.log').open('w',encoding='utf-8') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        try:
            for i,path in enumerate(frames):proc.stdin.write(compose(product_id,path,i/FPS).tobytes())
        except BaseException:
            proc.kill();proc.wait()
            raise
        finally:proc.stdin.close()
        if proc.wait():raise RuntimeError((QA/f'{product_id}-encode.log').read_text())
    result=subprocess.run([ffmpeg,'-hide_banner','-i',str(temporary),'-f','null','-'],capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stderr)
    temporary.replace(dest)
    poster_index=min(frame_count-1,round((duration-1.2)*FPS))
    compose(product_id,frames[poster_index],poster_index/FPS).save(poster,'WEBP',quality=90)
    print(f'{product_id} branded 3D export: {dest.stat().st_size:,} bytes; {frame_count} frames; decode OK',flush=True)


def update_manifest(keys):
    file=ROOT/'dist/demos.js';source=file.read_text(encoding='utf-8')
    data=json.loads(source[source.index('{'):source.rindex('}')+1])
    for key in keys:
        video,poster=paths(key)
        data[key].update(video=video.relative_to(ROOT/'dist').as_posix(),poster=poster.relative_to(ROOT/'dist').as_posix())
        for field in ('title','description','steps'):
            if field in DATA[key]:data[key][field]=DATA[key][field]
        data[key].pop('note',None)
    file.write_text("export const productDemos = "+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--preview',action='store_true');parser.add_argument('--all',action='store_true');parser.add_argument('--watch',action='store_true');parser.add_argument('--product',choices=DATA);parser.add_argument('--frames',default=str(ROOT/'tmp/render3d'))
    args=parser.parse_args();keys=[args.product] if args.product else sorted(DATA)
    if args.preview:
        sheet=Image.new('RGB',(1600,math.ceil(len(keys)/4)*400),PAPER)
        for i,key in enumerate(keys):
            t=DATA[key].get('duration',10)-1.2
            path=Path(args.frames)/key/f'frame-{round(t*FPS)+1:04}.png'
            im=compose(key,path,t);im.save(QA/f'{key}-preview.jpg',quality=95)
            sheet.paste(im.resize((400,400)),((i%4)*400,(i//4)*400))
        sheet.save(QA/'all-products-brand.jpg',quality=95)
        print(QA/'all-products-brand.jpg',flush=True)
    else:
        deadline=time.monotonic()+1800
        for key in keys:
            folder=Path(args.frames)/key
            if args.watch:
                print(f'Waiting for {key} render...',flush=True)
                while True:
                    try:
                        marker=json.loads((folder/'complete.json').read_text())
                        final_frame=round(DATA[key].get('duration',10)*FPS)
                        ready=not marker.get('preview',True) and not marker.get('rendering',False) and (folder/f'frame-{final_frame:04}.png').exists()
                    except (FileNotFoundError,json.JSONDecodeError):ready=False
                    if ready:break
                    if time.monotonic()>deadline:raise RuntimeError('Render did not complete within 30 minutes')
                    time.sleep(2)
            export(key,folder)
        update_manifest(keys)
