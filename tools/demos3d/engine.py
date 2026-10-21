"""Blender geometry, materials, animation, and lighting for catalog demonstrations."""
import bpy, math
from mathutils import Vector

FPS=24
CYAN='#81cdd3'; GREEN='#38b86d'; YELLOW='#f4cf39'; ORANGE='#f09a42'
PINK='#dfa0b9'; PURPLE='#a88ac8'; CREAM='#e9c99c'; WHITE='#fff8ea'; INK='#253c37'
MATS={}

def mat(color,rough=.38,metal=0):
    key=(color,rough,metal)
    if key not in MATS:
        value=color.lstrip('#'); srgb=[int(value[i:i+2],16)/255 for i in (0,2,4)]
        rgba=tuple(c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4 for c in srgb)+(1,)
        material=bpy.data.materials.new(color);material.diffuse_color=rgba;material.use_nodes=True
        shader=material.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=rgba
        shader.inputs['Roughness'].default_value=rough
        shader.inputs['Metallic'].default_value=metal
        MATS[key]=material
    return MATS[key]

def finish(obj,color,name=None,parent=None,bevel=0):
    if name:obj.name=name
    obj.data.materials.append(mat(color))
    if bevel:
        modifier=obj.modifiers.new('Rounded edges','BEVEL');modifier.width=bevel;modifier.segments=3
        normal=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL');normal.keep_sharp=True
    if obj.type=='MESH':
        for poly in obj.data.polygons:poly.use_smooth=True
    if parent:obj.parent=parent
    return obj

def empty(name='Group',loc=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=loc
    if parent:obj.parent=parent
    return obj

def box(loc,size,color,bevel=.07,parent=None,name='Rounded part',rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,color,name,parent,min(bevel,min(size)*.45))
    if rotation:o.rotation_euler=rotation
    return o

def cyl(loc,r,depth,color,parent=None,rot=None,bevel=.025,n=48,name='Cylinder'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=loc)
    o=finish(bpy.context.object,color,name,parent,min(bevel,depth*.28))
    if rot:o.rotation_euler=rot
    return o

def sphere(loc,scale,color,parent=None,n=24,name='Rounded detail'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=n,ring_count=max(8,n//2),radius=1,location=loc)
    o=bpy.context.object;o.scale=scale;return finish(o,color,name,parent)

def mesh(name,verts,faces,color,parent=None,bevel=0):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    return finish(o,color,name,parent,bevel)

def lathe(loc,profile,color,parent=None,n=56,name='Hollow part'):
    vs=[(r*math.cos(j*2*math.pi/n),r*math.sin(j*2*math.pi/n),z) for r,z in profile for j in range(n)]
    faces=[]
    for i in range(len(profile)):
        k=(i+1)%len(profile)
        for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,k*n+(j+1)%n,k*n+j))
    o=mesh(name,vs,faces,color,parent,.014);o.location=loc;return o

def ring(loc,outer,inner,depth,color,parent=None,kind='circle',n=48):
    theta=[j*2*math.pi/n for j in range(n)]
    def radius(t):
        if kind=='square':return outer/(abs(math.cos(t))**12+abs(math.sin(t))**12)**(1/12)
        if kind=='hex':return outer/math.cos((t+math.pi/6)%(math.pi/3)-math.pi/6)
        if kind=='triangle':return outer/math.cos((t+math.pi/3)%(2*math.pi/3)-math.pi/3)
        return outer
    rings=[[(radius(t)*math.cos(t),radius(t)*math.sin(t),z) for t in theta] for z in (-depth/2,depth/2)]
    rings += [[(inner*math.cos(t),inner*math.sin(t),z) for t in theta] for z in (depth/2,-depth/2)]
    vs=[p for r in rings for p in r];faces=[]
    for k in range(4):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,((k+1)%4)*n+(j+1)%n,((k+1)%4)*n+j))
    o=mesh('Shape with through-hole',vs,faces,color,parent,min(.032,depth*.2));o.location=loc;return o

def torus(loc,major,minor,color,parent=None,scale=(1,1,1),rot=None,name='Ring'):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=56,minor_segments=12,location=loc)
    o=finish(bpy.context.object,color,name,parent);o.scale=scale
    if rot:o.rotation_euler=rot
    return o

def curve(points,r,color,parent=None,name='Cord',cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12;data.bevel_depth=r;data.bevel_resolution=3
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,xyz in zip(spline.points,points):p.co=(*xyz,1)
    spline.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(mat(color))
    if parent:o.parent=parent
    return o

def bezier(p,u):
    a=1-u
    return tuple(a*a*a*p[0][k]+3*a*a*u*p[1][k]+3*a*u*u*p[2][k]+u*u*u*p[3][k] for k in range(3))

def arc(cx,cy,rx,ry,start,end,z,n=40):
    return [(cx+rx*math.cos(start+(end-start)*i/n),cy+ry*math.sin(start+(end-start)*i/n),z) for i in range(n+1)]

def text(value,loc,size,color=INK,parent=None,rotation=None,align='CENTER',name='Label'):
    data=bpy.data.curves.new(name,'FONT');data.body=value;data.align_x=align;data.align_y='CENTER';data.size=size;data.extrude=.0015;data.bevel_depth=.0005
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;data.materials.append(mat(color,.6))
    if rotation:o.rotation_euler=rotation
    if parent:o.parent=parent
    return o

def profile(points,depth,color,parent=None,name='Profile',bevel=.025):
    # Points are a counterclockwise outline in local XY, extruded along Z.
    n=len(points);vs=[(x,y,z) for z in (-depth/2,depth/2) for x,y in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vs,faces,color,parent,bevel)

def key(o,t,loc=None,rot=None,scale=None):
    f=round(t*FPS)+1
    for prop,val in (('location',loc),('rotation_euler',rot),('scale',scale)):
        if val is not None:setattr(o,prop,val);o.keyframe_insert(prop,frame=f)

def visible(o,start=0,end=10.1):
    for f,hide in ((0,True),(round(start*FPS)+1,False),(round(end*FPS)+1,True)):
        o.hide_render=hide;o.keyframe_insert('hide_render',frame=f)

def orient(o,direction):o.rotation_euler=Vector(direction).to_track_quat('Z','Y').to_euler()

def cut(obj,cutter):
    bpy.context.view_layer.objects.active=obj
    if obj.type!='MESH':obj.select_set(True);bpy.ops.object.convert(target='MESH')
    mod=obj.modifiers.new('Through-hole','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)

def stage_scene(target=(0,0,1.1),ortho=7.8,azimuth=32,elevation=36):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);MATS.clear()
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT'
    scene.render.resolution_x=960;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
    scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=240
    scene.eevee.taa_render_samples=16
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.65,.7,.64,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=-.45
    floor=cyl((0,0,-.075),3.35,.12,'#e0e8d3',bevel=.055,n=96,name='Sage display stage')
    for loc,power,size in (((-4,-5,8),700,5),((5,-1,6),450,5),((0,5,7),500,4)):
        bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector(target)-lamp.location).to_track_quat('-Z','Y').to_euler()
    a,e=math.radians(azimuth),math.radians(elevation)
    offset=Vector((8*math.sin(a)*math.cos(e),-8*math.cos(a)*math.cos(e),8*math.sin(e)))
    bpy.ops.object.camera_add(location=Vector(target)+offset);camera=bpy.context.object
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=ortho;scene.camera=camera
    return scene
