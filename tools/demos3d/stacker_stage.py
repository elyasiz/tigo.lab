"""Stage-only mesh renderer for the original Spinning Shapes Stacker motion.

Brand text and framing are composed by compose_3d_demos.py for all ten products.
"""
from functools import lru_cache
import numpy as np
from PIL import Image,ImageDraw,ImageFilter

SIZE=960
CYAN = '#84cdd1'
ORANGE = '#ed9345'
YELLOW = '#f0cc40'
PINK = '#dda3b6'
PURPLE = '#a58ac4'

def rgb(color):
    return np.array(tuple(bytes.fromhex(color.lstrip('#'))), dtype=float)

RIGHT = np.array([0.857493, 0.514496, 0.0])
UP = np.array([-0.262, 0.437, 0.860])
UP /= np.linalg.norm(UP)
VIEW = np.cross(RIGHT, UP)
LIGHT = np.array([-0.4, -0.65, 0.9]); LIGHT /= np.linalg.norm(LIGHT)

def project(v):
    p = np.asarray(v) - np.array([0.0, 0.0, 1.9])
    return np.stack([480 + p @ RIGHT * 129, 505 - p @ UP * 129], axis=-1)

def annular_shape(kind, color, height=0.40, n=48):
    theta = np.arange(n) * 2 * np.pi / n
    if kind == 'square':
        # Rounded square sampled at equal polar intervals.
        radius = .51 / (np.abs(np.cos(theta))**12 + np.abs(np.sin(theta))**12)**(1/12)
    elif kind == 'hex':
        a = (theta + np.pi/6) % (np.pi/3) - np.pi/6
        radius = .515 / np.cos(a)
    else:
        radius = np.full(n, .55)
    outer = np.stack([radius*np.cos(theta), radius*np.sin(theta)], axis=1)
    inner = np.stack([.255*np.cos(theta), .255*np.sin(theta)], axis=1)
    verts = []
    # Small bevels soften the rim while keeping a fully open hole.
    rings = [(outer*.96, -height/2), (outer, -height/2+.028),
             (outer, height/2-.028), (outer*.96, height/2),
             (inner*1.07, height/2), (inner, height/2-.025),
             (inner, -height/2+.025), (inner*1.07, -height/2)]
    for xy, z in rings:
        verts.extend((x, y, z) for x, y in xy)
    faces = []
    for r in range(len(rings)):
        q = (r+1) % len(rings)
        for j in range(n):
            k = (j+1) % n
            faces.extend(((r*n+j, r*n+k, q*n+k), (r*n+j, q*n+k, q*n+j)))
    return np.array(verts), np.array(faces), rgb(color)

def rod_mesh():
    n, m = 28, 110
    theta = np.arange(n)*2*np.pi/n
    vertices=[]
    for z in np.linspace(.29, 3.03, m):
        # A helical ridge around a visible yellow shaft.
        ridge = ((1+np.cos(theta - (z-.29)*2*np.pi/.78))/2)**5
        r = .125 + .105*ridge
        vertices.extend(zip(r*np.cos(theta), r*np.sin(theta), np.full(n, z)))
    faces=[]
    for iz in range(m-1):
        for j in range(n):
            k=(j+1)%n; a=iz*n+j; b=iz*n+k; c=(iz+1)*n+k; d=(iz+1)*n+j
            faces.extend(((a,b,c),(a,c,d)))
    vertices.extend(((0,0,.29),(0,0,3.03)))
    for j in range(n):
        k=(j+1)%n
        faces.extend(((m*n,k,j),(m*n+1,(m-1)*n+j,(m-1)*n+k)))
    return np.array(vertices), np.array(faces), rgb('#f1cb35')

def base_mesh():
    # Beveled rectangular platform.
    rect = np.array([[-2.52,-.77],[2.52,-.77],[2.59,-.70],[2.59,.70],
                     [2.52,.77],[-2.52,.77],[-2.59,.70],[-2.59,-.70]])
    verts=[]
    for factor,z in ((.98,.02),(1,.06),(1,.22),(.98,.29)):
        verts.extend((x*factor,y*factor,z) for x,y in rect)
    faces=[]
    for i in range(3):
        for j in range(8):
            k=(j+1)%8
            faces.extend(((i*8+j,i*8+k,(i+1)*8+k),(i*8+j,(i+1)*8+k,(i+1)*8+j)))
    verts.append((0,0,.29))
    # Subdivide the broad top surface so painter depth ordering stays local.
    for j in range(8):
        a=np.array(verts[32]); b=np.array(verts[24+j]); c=np.array(verts[24+(j+1)%8])
        n=10; lookup={}
        for u in range(n+1):
            for v in range(n+1-u):
                lookup[u,v]=len(verts)
                verts.append(tuple(a+(b-a)*u/n+(c-a)*v/n))
        for u in range(n):
            for v in range(n-u):
                faces.append((lookup[u,v],lookup[u+1,v],lookup[u,v+1]))
                if v<n-u-1:
                    faces.append((lookup[u+1,v],lookup[u+1,v+1],lookup[u,v+1]))
    return np.array(verts),np.array(faces),rgb(CYAN)

def transform(mesh, x=0, z=0, angle=0):
    vertices, faces, color = mesh
    v=vertices.copy()
    c,s=np.cos(angle),np.sin(angle)
    v[:,:2]=v[:,:2] @ np.array([[c,s],[-s,c]])
    v+=np.array([x,0,z])
    return v,faces,color

BASE=base_mesh(); ROD=rod_mesh()
COLUMNS = [(-1.70,'square',[CYAN,ORANGE,YELLOW]),
           (0,'hex',[YELLOW,ORANGE,PINK,CYAN,PURPLE]),
           (1.70,'circle',[ORANGE,PURPLE,CYAN,YELLOW,PINK])]
BLOCKS = [(x, kind, i, annular_shape(kind,color))
          for x,kind,colors in COLUMNS for i,color in enumerate(colors)]


@lru_cache(maxsize=4)
def background(paper,cream):
    bg=Image.new('RGBA',(SIZE,SIZE),paper)
    d=ImageDraw.Draw(bg)
    d.ellipse((60,205,900,838),fill=cream)
    shadow=Image.new('RGBA',(SIZE,SIZE),(0,0,0,0))
    sd=ImageDraw.Draw(shadow)
    poly=project(np.array([[-2.7,-.88,.01],[2.7,-.88,.01],[2.7,.88,.01],[-2.7,.88,.01]]))
    sd.polygon([tuple(p) for p in poly+np.array([8,10])],fill=(17,23,43,35))
    return Image.alpha_composite(bg,shadow.filter(ImageFilter.GaussianBlur(14)))

def stage_frame(t,paper='#fff',cream='#fff3e0'):
    objects=[BASE]+[transform(ROD,x=x) for x,_,_ in COLUMNS]
    moving=False
    for x,kind,i,mesh in BLOCKS:
        start=.65+i*1.48+(0 if x<0 else .12 if x==0 else .24)
        u=(t-start)/1.30
        if u<0: continue
        target=.29+.205+i*.40
        if u>=1:
            z=target; angle=0
        else:
            moving=True
            # Smooth speed at the ends; rotation and vertical travel stay coupled.
            ease=u*u*(3-2*u)
            z=4.24+(target-4.24)*ease
            angle=(z-target)*2*np.pi/.78
        objects.append(transform(mesh,x=x,z=z,angle=angle))
    all_tris=[]; all_colors=[]
    for vertices, faces, color in objects:
        tri=vertices[faces]
        normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
        lengths=np.linalg.norm(normals,axis=1)
        normals/=np.maximum(lengths[:,None],1e-8)
        # RIGHT cross UP points toward the camera.
        visible=normals @ VIEW > .0001
        tri=tri[visible]; normals=normals[visible]
        intensity=.62+.38*np.maximum(0,normals @ LIGHT)
        all_tris.append(tri)
        all_colors.append(np.clip(color[None,:]*intensity[:,None],0,255).astype(np.uint8))
    tris=np.concatenate(all_tris); colors=np.concatenate(all_colors)
    depth=tris.mean(axis=1) @ VIEW
    points=project(tris)
    im=background(paper,cream).copy(); draw=ImageDraw.Draw(im)
    for idx in np.argsort(depth):
        p=points[idx]
        if p[:,1].max()<198 or p[:,1].min()>838: continue
        draw.polygon([tuple(v) for v in p],fill=tuple(colors[idx]))
    return im.crop((0,200,SIZE,840)).convert('RGBA')
