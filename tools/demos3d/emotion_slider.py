"""Emotion Slider: five independent 3D faces constrained to one recessed rail."""
import math
import json
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from engine import (stage_scene, empty, profile, cut, cyl, sphere, curve,
                    arc, bezier, key, mat)

ORANGE = '#ff801b'
CREAM = '#ead6b4'
INK = '#22242a'
FACE_COLORS = ['#f8cd1a', '#249fd4', '#f34425', '#7946b0', '#36ce52']


def rounded_outline(width, height, radius, segments=14):
    points = []
    for cx, cy, start in ((width/2-radius, height/2-radius, 0),
                          (-width/2+radius, height/2-radius, 90),
                          (-width/2+radius, -height/2+radius, 180),
                          (width/2-radius, -height/2+radius, 270)):
        for i in range(segments+1):
            angle = math.radians(start+i*90/segments)
            points.append((cx+radius*math.cos(angle), cy+radius*math.sin(angle)))
    return points


def rounded_slab(width, height, radius, depth, z, color, name):
    obj = profile(rounded_outline(width, height, radius), depth, color,
                  name=name, bevel=.018)
    obj.location.z = z
    return obj


def face_patch(points, color, parent, name, z=.665):
    obj = profile(points, .013, color, parent=parent, name=name, bevel=.005)
    obj.location.z = z
    return obj


def stroke(points, parent, name='Raised face detail', thickness=.025):
    return curve([(x, y, .678) for x, y in points], thickness, INK,
                 parent=parent, name=name)


def eye(x, y, parent, radius=.084):
    cyl((x, y, .670), radius, .020, INK, parent, n=48, bevel=.006,
        name='Black eye')
    sphere((x-.025, y+.035, .686), (.021, .026, .006), '#ffffff',
           parent, n=16, name='Eye highlight')


def bezier2(points, t):
    return bezier([(x,y,0) for x,y in points],t)[:2]


def draw_face(parent, kind):
    for x in (() if kind=='sad' else (-.35, .35)):
        cyl((x, -.145, .670), .072, .016, '#f7b9b4', parent,
            bevel=.005, n=40, name='Pink cheek')
    if kind == 'happy':
        for x in (-.20, .20):
            stroke([(a,b) for a,b,_ in arc(x,.10,.105,.09,0,math.pi,0)], parent)
            stroke([(x-.075,.32),(x-.01,.345),(x+.07,.32)], parent, thickness=.021)
        mouth = [bezier2([(-.28,-.10),(-.16,-.19),(.15,-.19),(.28,-.10)],i/16) for i in range(17)]
        mouth += [bezier2([(.28,-.10),(.22,-.47),(-.22,-.47),(-.28,-.10)],i/24) for i in range(1,25)]
        face_patch(mouth, INK, parent, 'Open happy smile')
        sphere((.045,-.315,.685),(.145,.071,.011),'#f7b3c3',parent,n=32,name='Pink tongue')
    elif kind == 'sad':
        for x in (-.20,.20):
            eye(x,.085,parent)
            sign=1 if x>0 else -1
            stroke([(x+sign*.10,.33),(x,.29),(x-sign*.09,.35)],parent,thickness=.021)
            tx=x+sign*.13
            tear=[bezier2([(tx,.005),(tx-.03,-.055),(tx-.09,-.12),(tx-.07,-.19)],i/12) for i in range(13)]
            tear += [bezier2([(tx-.07,-.19),(tx-.045,-.27),(tx+.065,-.26),(tx+.075,-.18)],i/12) for i in range(1,13)]
            tear += [bezier2([(tx+.075,-.18),(tx+.08,-.10),(tx+.025,-.04),(tx,.005)],i/12) for i in range(1,13)]
            face_patch(tear,'#e1f6fc',parent,'Pale tear',z=.684)
        stroke([(a,b) for a,b,_ in arc(0,-.34,.245,.18,0,math.pi,0)],parent,thickness=.028)
    elif kind == 'angry':
        for x in (-.20,.20):
            eye(x,.065,parent)
            sign=1 if x>0 else -1
            stroke([(x+sign*.12,.28),(x-sign*.11,.17)],parent,thickness=.042)
        stroke([(a,b) for a,b,_ in arc(0,-.33,.245,.16,0,math.pi,0)],parent,thickness=.031)
        stroke([(-.055,.32),(-.08,.41)],parent,thickness=.015)
        stroke([(.055,.32),(.08,.41)],parent,thickness=.015)
        stroke([(-.10,-.36),(0,-.32),(.10,-.36)],parent,thickness=.015)
    elif kind == 'sleepy':
        for x in (-.20,.20):
            stroke([(a,b) for a,b,_ in arc(x,.16,.12,.07,math.pi,math.tau,0)],parent)
            stroke([(a,b) for a,b,_ in arc(x,.35,.105,.055,math.pi,math.tau,0)],parent,thickness=.022)
        mouth=cyl((0,-.24,.67),.095,.022,INK,parent,n=48,bevel=.006,name='Round sleepy mouth')
        mouth.scale.y=1.20
    else:
        for x in (-.20,.20):
            eye(x,.08,parent,radius=.065)
            stroke([(x-.10,.16),(x+.08,.18)],parent,thickness=.018)
            stroke([(x-.07,.31),(x+.02,.33),(x+.09,.31)],parent,thickness=.023)
        smile=[bezier2([(-.23,-.23),(-.03,-.35),(.24,-.24),(.25,-.075)],i/24) for i in range(25)]
        stroke(smile,parent,thickness=.026)
        stroke([(.16,-.075),(.25,-.07),(.31,-.12)],parent,thickness=.020)


def emotion_slider():
    scene=stage_scene(target=(0,0,.33),ortho=9.6,azimuth=22,elevation=57)
    scene.frame_end=288
    floor=bpy.data.objects['Sage display stage']
    floor.scale=(1.33,.82,1)
    floor.data.materials.clear()
    floor.data.materials.append(mat('#fff3e0',.7))
    floor.name='Cream TIGO display stage'

    base=rounded_slab(7.6,1.88,.41,.43,.225,ORANGE,'Orange rounded slider base')
    cutter=rounded_slab(7.04,1.29,.48,.70,.56,'#ffffff','Rail recess cutter')
    cut(base,cutter)
    lip=rounded_slab(7.43,1.73,.37,.135,.435,CREAM,'Cream inset frame')
    cutter=rounded_slab(7.04,1.29,.48,.9,.50,'#ffffff','Frame channel cutter')
    cut(lip,cutter)
    rounded_slab(7.02,1.27,.47,.035,.225,'#806b53','Recessed channel floor')

    for index,(kind,color) in enumerate(zip(['happy','sad','angry','sleepy','smile'],FACE_COLORS)):
        face=empty(f'Emotion {kind}')
        cyl((0,0,.355),.14,.22,color,face,n=40,bevel=.015,name='Sliding stem inside rail')
        cyl((0,0,.53),.572,.24,color,face,n=80,bevel=.035,name=f'{kind} face disc')
        draw_face(face,kind)
        start_x=-2.08+index*1.19
        # Each face moves along X only, stays on the rail, and never overtakes
        # another face. The resulting gap travels through the row.
        for t,x in ((0,start_x),(1.8+index*.87,start_x),
                    (2.65+index*.87,start_x-.62),(10.45,start_x-.62),
                    (11.8,start_x),(12,start_x)):
            key(face,t,loc=(x,0,0))

    # Exported projection points let the compositor show a teaching cue without
    # adding a physical ring or accessory to the actual product model.
    scene['emotion_selected_object']='Emotion happy'
    return scene


def export_cues(folder, scene):
    faces=[bpy.data.objects[f'Emotion {kind}'] for kind in ('happy','sad','angry','sleepy','smile')]
    frames=[]
    def project(point):
        p=world_to_camera_view(scene,scene.camera,point)
        return [round(p.x*960,3),round((1-p.y)*640,3)]
    for frame in range(scene.frame_start,scene.frame_end+1):
        scene.frame_set(frame)
        centers=[round(face.location.x,6) for face in faces]
        assert all(-2.94<=x<=2.94 for x in centers), 'A face left the channel.'
        assert all(b-a>=1.144-1e-5 for a,b in zip(centers,centers[1:])), 'Discs overlap or swap order.'
        selected=faces[0].matrix_world
        center=selected@Vector((0,0,.70))
        outline=[project(selected@Vector((.65*math.cos(i*math.tau/48),.65*math.sin(i*math.tau/48),.70))) for i in range(49)]
        frames.append({'frame':frame,'centers':centers,'selected':project(center),'outline':outline})
    (folder/'motion.json').write_text(json.dumps({'fps':scene.render.fps,'frames':frames}),encoding='utf-8')
