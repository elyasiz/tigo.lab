"""Code Tiles: assemble, run a route, remove one surplus advance and retry.

The marker represents a token moved by a child/teacher, not an electronic robot.
The 4x4 map and final route match the published illustrated Coding guide.
"""
import math
from pathlib import Path
import bpy
from engine import stage_scene, empty, box, cyl, profile, curve, text, torus, key, visible, mat

GREEN='#177a37'; BLUE='#086ccb'; PURPLE='#7950b2'; YELLOW='#f8cd1a'
WHITE='#ffffff'; RED='#bd492f'
CELL=.70
PROGRAM_Y=-1.78
SPACING=.84
FONT=None


def cell(col,row,z=.36):
    return (-1.65+col*CELL,1.70-row*CELL,z)


def outline():
    points=[(-.40,-.39),(.40,-.39),(.40,-.115)]
    points += [(.40+.115*math.cos(-math.pi/2+i*math.pi/16),
                .115*math.sin(-math.pi/2+i*math.pi/16)) for i in range(17)]
    points += [(.40,.39),(-.40,.39),(-.40,.115)]
    points += [(-.40+.125*math.cos(math.pi/2-i*math.pi/16),
                .125*math.sin(math.pi/2-i*math.pi/16)) for i in range(17)]
    return points


def label(value,loc,size,parent,name):
    obj=text(value,loc,size,WHITE,parent,name=name)
    obj.data.font=FONT
    obj.data.space_line=.90
    return obj


def tile(name,kind,position):
    group=empty(name,position)
    color={'start':GREEN,'forward':BLUE,'back':BLUE,'right':PURPLE,'left':PURPLE,'repeat':YELLOW}[kind]
    solid=profile(outline(),.14,color,group,name=f'{name} interlocking body',bevel=.018)
    # Keep the label faces planar; smooth only the extruded side walls.
    solid.data.polygons[0].use_smooth=False
    solid.data.polygons[1].use_smooth=False
    curve([(x*.86,y*.86,.077) for x,y in outline()],.009,WHITE,group,
          name=f'{name} white inset border',cyclic=True)
    words={'start':'Start','forward':'Move\nForward','back':'Move\nBackward','left':'Turn\nLeft','right':'Turn\nRight','repeat':'Repeat x2'}
    label(words[kind],(0,.19,.081),.105,group,f'{name} label')
    if kind=='start':
        points=[(-.105,-.04),(.12,-.15),(-.105,-.26)]
    elif kind in ('forward','back'):
        points=[(-.035,-.28),(.035,-.28),(.035,-.12),(.11,-.12),(0,.005),(-.11,-.12),(-.035,-.12)]
        if kind=='back':points=[(x,-.28-y) for x,y in reversed(points)]
    elif kind in ('right','left'):
        points=[(-.12,-.28),(-.05,-.28),(-.05,-.135),(.035,-.135),(.035,-.205),(.16,-.10),(.035,.005),(.035,-.065),(-.12,-.065)]
        if kind=='left':points=[(-x,y) for x,y in reversed(points)]
    else:
        points=[]
        for i in range(33):
            angle=.3+(math.tau-.7)*i/32
            points.append((.125*math.cos(angle),-.14+.125*math.sin(angle),.09))
        curve(points,.017,WHITE,group,name=f'{name} repeat symbol')
        points=[(.11,-.24),(.18,-.24),(.16,-.16)]
    symbol=profile(points,.012,WHITE,group,name=f'{name} raised arrow',bevel=.003)
    symbol.location.z=.088
    return group


def show_group(group,start,end):
    for obj in group.children_recursive:visible(obj,start,end)


def highlight(part,start,end,color=YELLOW):
    group=empty('Active instruction highlight',parent=part)
    curve([(x*1.04,y*1.04,.09) for x,y in outline()],.022,color,group,
          name='Active tile outline',cyclic=True)
    show_group(group,start,end)


def cross(name,position,start,end,parent=None):
    group=empty(name,position,parent)
    for side in (-1,1):
        curve([(-.10,side*.10,.01),(.10,-side*.10,.01)],.026,RED,group,name=name+' stroke')
    show_group(group,start,end)


def code_tiles():
    global FONT
    scene=stage_scene((0,.03,.25),8.3,0,67)
    FONT=bpy.data.fonts.load(str(Path(__file__).resolve().parents[2]/'server/assets/nunito-700.ttf'))
    stage=bpy.data.objects['Sage display stage'];stage.scale.x=1.08
    stage.data.materials.clear();stage.data.materials.append(mat('#edf6ff'))
    stage.name='Pale blue Coding display stage'
    box((-.60,.65,.10),(3.10,3.10,.18),'#b7d9e8',.11,name='Four by four activity board')
    for row in range(4):
        for col in range(4):
            color='#eafaf0' if (col,row)==(0,3) else '#fff3c2' if (col,row)==(1,1) else WHITE
            box(cell(col,row,.205),(.685,.685,.045),color,.02,name=f'Board cell {col} {row}')
    goal=[]
    for i in range(10):
        angle=math.pi/2+i*math.pi/5;radius=.24 if i%2==0 else .105
        goal.append((radius*math.cos(angle),radius*math.sin(angle)))
    star=profile(goal,.026,YELLOW,name='Goal star',bevel=.008);star.location=cell(1,1,.246)
    kinds=['start','forward','forward','forward','right','forward']
    parts=[]
    for i,kind in enumerate(kinds):
        part=tile(f'Instruction {i} {kind}',kind,(0,0,0));parts.append(part)
        x=(i-2.5)*SPACING
        key(part,0,loc=(x,-2.8,.50),rot=(0,0,-.14))
        start=.35+i*.70
        key(part,start,loc=(x,-2.8,.50),rot=(0,0,-.14))
        key(part,start+.38,loc=(x,PROGRAM_Y,.55),rot=(0,0,0))
        key(part,start+.64,loc=(x,PROGRAM_Y,.12),rot=(0,0,0))
        highlight(part,5.5+i,6.4+i)
    extra=parts[3]
    key(extra,12.0,loc=(.5*SPACING,PROGRAM_Y,.12))
    key(extra,12.45,loc=(.5*SPACING,PROGRAM_Y,.85),rot=(0,0,.12))
    key(extra,13.0,loc=(2.1,-.95,.55),rot=(0,0,0))
    key(extra,13.4,loc=(2.1,-.95,.12),rot=(0,0,0))
    highlight(extra,11.2,13.4,RED)
    cross('Surplus advance indicator',(0,-.14,.16),11.2,13.4,extra)
    # Close the vacancy, leaving Start / Forward / Forward / Right / Forward.
    for i in (4,5):
        x=(i-2.5)*SPACING
        key(parts[i],12.5,loc=(x,PROGRAM_Y,.12))
        key(parts[i],13.5,loc=(x-SPACING,PROGRAM_Y,.12))
    for i,start in zip((0,1,2,4,5),(14.0,15.0,16.0,17.0,18.0)):
        highlight(parts[i],start,start+.9)
    for i,(kind,word) in enumerate((('repeat','Repeat'),('left','Left'),('back','Backward'))):
        tile(f'Spare {word} tile',kind,(2.1,1.90-i*.95,.12))
    marker=empty('Manual direction marker',cell(0,3))
    cyl((0,0,0),.225,.13,GREEN,marker,bevel=.025,n=64,name='Green manual marker')
    arrow=profile([(-.12,-.11),(0,.15),(.12,-.11),(0,-.045)],.016,WHITE,marker,
                  name='Marker direction arrow',bevel=.007);arrow.location.z=.078
    # First pass has one surplus advance: the token stops one row above the goal.
    key(marker,0,loc=cell(0,3),rot=(0,0,0))
    for start,end,col,row in ((6.4,7.1,0,2),(7.4,8.1,0,1),(8.4,9.1,0,0)):
        key(marker,start,loc=tuple(marker.location));key(marker,end,loc=cell(col,row))
    key(marker,9.4,rot=(0,0,0));key(marker,10.1,rot=(0,0,-math.pi/2))
    key(marker,10.4,loc=cell(0,0));key(marker,11.1,loc=cell(1,0))
    cross('Missed goal indicator',cell(1,0,.51),11.2,12.8)
    key(marker,12.5,loc=cell(1,0),rot=(0,0,-math.pi/2))
    key(marker,12.9,loc=cell(1,0,.95))
    key(marker,13.7,loc=cell(0,3,.95),rot=(0,0,0))
    key(marker,14.2,loc=cell(0,3))
    # Second pass: two northward steps, turn east in place, one eastward step.
    key(marker,15.0,loc=cell(0,3));key(marker,15.7,loc=cell(0,2))
    key(marker,16.0,loc=cell(0,2));key(marker,16.7,loc=cell(0,1))
    key(marker,17.0,loc=cell(0,1),rot=(0,0,0))
    key(marker,17.7,loc=cell(0,1),rot=(0,0,-math.pi/2))
    key(marker,18.0,loc=cell(0,1));key(marker,18.7,loc=cell(1,1))
    key(marker,22,loc=cell(1,1),rot=(0,0,-math.pi/2))
    halo=torus(cell(1,1,.285),.295,.020,YELLOW,name='Goal confirmation ring')
    visible(halo,18.7,22.1)
    key(halo,18.7,scale=(.9,.9,1));key(halo,19.2,scale=(1.15,1.15,1));key(halo,19.7,scale=(1,1,1))
    # Linear transforms keep moves orthogonal and turns strictly in their cell.
    for obj in bpy.data.objects:
        if obj.animation_data and obj.animation_data.action:
            for fc in obj.animation_data.action.fcurves:
                if fc.data_path in ('location','rotation_euler'):
                    for point in fc.keyframe_points:point.interpolation='LINEAR'
    scene.frame_set(1)
