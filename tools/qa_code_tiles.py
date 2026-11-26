"""Run in Blender to check route endpoints, in-place turns and the corrected program."""
from pathlib import Path
import sys,json,math
import bpy

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/demos3d'))
from code_tiles import code_tiles,cell,PROGRAM_Y,SPACING
code_tiles()
scene=bpy.context.scene
marker=bpy.data.objects['Manual direction marker']

def at(t):
    scene.frame_set(round(t*24)+1)
    return tuple(marker.location)

def close(a,b):
    assert max(abs(x-y) for x,y in zip(a,b))<.002,(a,b)

samples=[]
for t,col,row in ((6.3,0,3),(7.2,0,2),(8.2,0,1),(9.2,0,0),(10.2,0,0),(11.2,1,0),(14.3,0,3),(15.8,0,2),(16.8,0,1),(17.8,0,1),(18.8,1,1),(21.8,1,1)):
    position=at(t);close(position,cell(col,row));samples.append({'time':t,'cell':[col,row],'position':position})
for start in (9.4,17.0):
    positions=[at(start+i/24) for i in range(18)]
    for position in positions:close(position,positions[0])
    assert abs(marker.rotation_euler.z+math.pi/2)<.002,'right turn must face east'
at(14.3)
for slot,index in enumerate((0,1,2,4,5)):
    obj=bpy.data.objects[f'Instruction {index} '+('start' if index==0 else 'right' if index==4 else 'forward')]
    close(tuple(obj.location),((slot-2.5)*SPACING,PROGRAM_Y,.12))
close(tuple(bpy.data.objects['Instruction 3 forward'].location),(2.1,-.95,.12))
folder=ROOT/'tmp/code-tiles-qa';folder.mkdir(parents=True,exist_ok=True)
(folder/'route-checks.json').write_text(json.dumps({'passed':True,'samples':samples,'turns_in_place':True,'surplus_tile_removed':True},indent=2))
for t in (4.8,11.5,20.0):
    scene.frame_set(round(t*24)+1);scene.render.filepath=str(folder/f'stage-{t:.1f}.png')
    bpy.ops.render.render(write_still=True)
print('PASS: route endpoints, both in-place right turns, removal of one surplus tile, and five-tile corrected program.',flush=True)
