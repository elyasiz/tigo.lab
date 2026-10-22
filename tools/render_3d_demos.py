"""Run with Blender 4.5 LTS: blender -b --python tools/render_3d_demos.py -- --all.

Only generates local frame sequences. Export/publish is handled separately.
"""
from pathlib import Path
import sys,argparse,time,json
import bpy

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(Path(__file__).resolve().parent/'demos3d'))
import models

MODELS={'M01':'train','M02':'beads','M03':'funnel','M04':'dino','M05':'hair_cutting','M06':'donut','M07':'hair_beading','M08':'cash_register','M09':'stacker','M10':'shoe'}

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser();parser.add_argument('--product',choices=MODELS);parser.add_argument('--preview',action='store_true');parser.add_argument('--all',action='store_true');parser.add_argument('--out',default=str(ROOT/'tmp/render3d'));parser.add_argument('--frame',type=int,default=115)
    opts=parser.parse_args(args)
    keys=[opts.product] if opts.product else list(MODELS)
    for product_id in keys:
        start=time.time();folder=Path(opts.out).resolve()/product_id;folder.mkdir(parents=True,exist_ok=True)
        (folder/'complete.json').write_text(json.dumps({'product':product_id,'preview':True,'rendering':True}))
        print(f'START {product_id}',flush=True)
        getattr(models,MODELS[product_id])()
        scene=bpy.context.scene;scene.render.image_settings.compression=15
        config=json.loads((ROOT/'tools/demos3d/products.json').read_text(encoding='utf-8'))[product_id]
        scene.frame_end=round(config.get('duration',10)*scene.render.fps)
        if opts.preview:
            scene.frame_set(opts.frame);scene.render.filepath=str(folder/'preview.png');bpy.ops.render.render(write_still=True)
        else:
            scene.render.filepath=str(folder/'frame-');bpy.ops.render.render(animation=True)
        (folder/'complete.json').write_text(json.dumps({'product':product_id,'preview':opts.preview,'seconds':round(time.time()-start,2)}))
        print(f'FINISHED {product_id}: {time.time()-start:.1f}s',flush=True)
