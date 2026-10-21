"""Product-specific 3D models and independent component motions, built from catalog references."""
import bpy,math,random
from mathutils import Vector
from engine import *

def train():
    stage_scene((0,0,1),8.2,28,30);root=empty('Train assembly')
    box((0,0,.60),(4,1.55,.40),ORANGE,.18,root)
    box((-1.16,0,1.48),(1.28,1.30,1.53),CYAN,.09,root)
    # Recessed windows on the visible cab wall and the cab end.
    for x in (-1.47,-.88):
        box((x,-.662,1.72),(.39,.035,.62),'#547d83',.055,root)
        box((x,-.688,1.74),(.30,.018,.50),'#badfe0',.035,root)
    box((-1.18,0,2.32),(1.65,1.78,.32),GREEN,.15,root)
    cyl((.62,0,1.32),.62,2.15,PURPLE,root,(0,math.pi/2,0),.05,n=64)
    cyl((1.73,0,1.32),.63,.19,ORANGE,root,(0,math.pi/2,0),.05)
    cyl((1.85,0,1.32),.44,.04,'#edaa52',root,(0,math.pi/2,0),.02)
    lathe((.78,0,1.81),[(.22,0),(.23,.55),(.31,.65),(.31,.73),(.20,.73),(.18,.13)],ORANGE,root,name='Open chimney')
    # The far-side wheels are already attached; near wheels slide onto the axles.
    for x in (-1.23,1.15):
        cyl((x,0,.56),.10,2.0,'#75a55c',root,(math.pi/2,0,0))
        cyl((x,.85,.56),.55,.28,YELLOW,root,(math.pi/2,0,0),.06)
    for i,x in enumerate((-1.23,1.15)):
        wheel=empty('Attachable wheel',parent=root)
        cyl((0,0,0),.56,.31,YELLOW,wheel,(math.pi/2,0,0),.055,n=64)
        hub=cyl((0,-.19,0),.27,.10,GREEN,wheel,(math.pi/2,0,0),.025)
        box((0,-.255,0),(.29,.018,.075),'#287f4b',.008,wheel)
        box((0,-.255,0),(.075,.018,.29),'#287f4b',.008,wheel)
        key(wheel,0,loc=(x,-2.1,.56),rot=(0,0,0))
        key(wheel,.5+i*1.7,loc=(x,-2.1,.56),rot=(0,0,0))
        key(wheel,1.9+i*1.7,loc=(x,-.87,.56),rot=(0,math.pi*2,0))
        key(wheel,7.1,rot=(0,math.pi*2,0));key(wheel,9.0,rot=(0,math.pi*3.4,0))
    driver=empty('Toy screwdriver')
    cyl((0,0,.0),.065,.74,'#a8babd',driver,(math.pi/2,0,0),.015)
    handle=cyl((0,-.68,0),.19,.69,PINK,driver,(math.pi/2,0,0),.08)
    for k in range(6):
        a=k*math.pi/3
        cyl((math.cos(a)*.17,-.69,math.sin(a)*.17),.025,.43,'#c886a1',driver,(math.pi/2,0,0),.012,n=12)
    key(driver,0,loc=(1.9,-1.45,.26),rot=(0,0,.7));key(driver,3.8,loc=(1.9,-1.45,.26),rot=(0,0,.7))
    key(driver,4.5,loc=(1.15,-1.45,.56),rot=(0,0,0));key(driver,6.0,loc=(1.15,-1.45,.56),rot=(0,math.pi*5,0))
    key(driver,6.9,loc=(1.9,-1.45,.25),rot=(0,math.pi*5,.6))
    key(root,0,loc=(-.18,0,0));key(root,7.1,loc=(-.18,0,0));key(root,9.1,loc=(.42,0,0))

CORD=[(2.2,1.1,.50),(2.6,-.1,.45),(-1.8,.85,.42),(-2.1,-.9,.42)]
def beads():
    stage_scene((0,0,.40),8.2,48,43)
    curve([bezier(CORD,i/80) for i in range(81)],.055,'#eadbbc',name='Threading cord')
    cyl(CORD[-1],.23,.12,'#398cbb',rot=(math.pi/2,0,0),bevel=.03)
    needle=cyl((2.14,1.33,.51),.055,.55,'#3287bb',bevel=.025)
    orient(needle,(.1,.8,.1))
    kinds=['square','triangle','circle','square','circle']
    colors=[YELLOW,GREEN,PINK,CYAN,ORANGE]
    for i,(kind,color) in enumerate(zip(kinds,colors)):
        bead=ring((0,0,0),.28 if kind!='triangle' else .20,.11,.43,color,kind=kind)
        start=.55+i*1.3; initial=(-1.5+i*.76,-1.85,.35)
        key(bead,0,loc=initial,rot=(math.pi/2,0,.2*i))
        key(bead,start,loc=initial,rot=(math.pi/2,0,.2*i))
        key(bead,start+.4,loc=CORD[0])
        target=.94-i*.16
        for j in range(9):
            u=j/8*target;p=bezier(CORD,u);q=bezier(CORD,min(1,u+.008))
            orient(bead,Vector(q)-Vector(p));key(bead,start+.4+j/8*1.2,loc=p,rot=tuple(bead.rotation_euler))

def grain(loc,color='#e5c98c',size=.04):return sphere(loc,(size,size*.70,size*.65),color,n=12,name='Play material grain')

def funnel():
    stage_scene((0,0,1.20),8.2,24,32)
    for x in (-2.12,2.12):box((x,0,1.45),(.22,1.18,2.9),CYAN,.10)
    for z in (.30,2.25):box((0,0,z),(4.42,1.08,.21),CYAN,.085)
    for i,x in enumerate((-1.35,0,1.35)):
        lathe((x,0,2.48),[(.46,.39),(.18,-.30),(.16,-.59),(.105,-.59),(.115,-.28),(.40,.37)],'#a1cf49',name='Open green funnel')
        lathe((x,0,.80),[(.43,.46),(.43,-.45),(.32,-.49),(.30,-.35),(.35,.43)],'#9fc84c',name='Receiving bucket')
        cyl((x,0,.37),.31,.06,'#91b343',bevel=.02)
        rng=random.Random(60+i)
        for j in range(34):
            a=rng.random()*math.tau;r=math.sqrt(rng.random())*.30
            g=grain((x+r*math.cos(a),r*math.sin(a),1.08+j%3*.017))
            visible(g,1.9+i*2.15+j/34,10.2)
        for j in range(20):
            g=grain((x,0,3.2),size=.035)
            start=1.25+i*2.15+j/20*.80
            visible(g,start,start+.82)
            key(g,start,loc=(x+.04*math.sin(j),-.08,3.17));key(g,start+.33,loc=(x+.025*math.sin(j),0,2.25))
            key(g,start+.82,loc=(x+.15*math.sin(j),.12*math.cos(j),.64))
    lathe((-2,-1.5,.22),[(.63,.15),(.57,-.14),(.20,-.18),(.16,-.10),(.52,.10)],CYAN,name='Material bowl')
    rng=random.Random(15)
    for j in range(65):
        a=rng.random()*math.tau;r=math.sqrt(rng.random())*.47;grain((-2+r*math.cos(a),-1.5+r*math.sin(a),.30),size=.043)
    spoon=empty('Pouring spoon')
    lathe((0,0,0),[(.26,.05),(.21,-.09),(.02,-.10),(.02,-.04),(.23,.08)],CYAN,spoon,name='Spoon bowl')
    box((.57,0,.02),(.85,.12,.10),CYAN,.05,spoon)
    for i,x in enumerate((-1.35,0,1.35)):
        start=.5+i*2.15
        key(spoon,start,loc=(-1.75,-1.45,.36),rot=(0,0,-.5))
        key(spoon,start+.70,loc=(x,-.06,3.28),rot=(0,0,-.2))
        key(spoon,start+1.15,loc=(x,-.06,3.25),rot=(0,.65,-.2))
        key(spoon,start+1.65,loc=(x,-.06,3.25),rot=(0,.65,-.2))
    key(spoon,7.5,loc=(-1.75,-1.45,.4),rot=(0,0,-.5))

def dino():
    stage_scene((.10,0,1.45),8.8,20,29)
    outline=[(220,562),(210,450),(225,366),(241,337),(231,310),(202,296),(185,303),(209,275),(244,266),(285,273),(317,298),(330,333),(333,386),(344,427),(360,444),(440,429),(510,436),(584,458),(642,502),(698,558),(746,582),(790,569),(811,555),(801,591),(765,613),(705,629),(643,622),(606,639),(582,629),(576,615),(512,619),(508,654),(480,665),(453,652),(451,622),(372,611),(369,646),(340,654),(318,637),(318,607),(273,591)]
    def coord(p):return ((p[0]-500)/125,(680-p[1])/125+.22)
    body=profile([coord(p) for p in reversed(outline)],.28,GREEN,name='Dinosaur board',bevel=.045);body.rotation_euler.x=math.pi/2
    box((.15,.10,.14),(6.4,1.60,.28),'#252a29',.18,name='Black dinosaur base')
    # One continuous opening shows coins sliding from the neck toward the tail.
    chute=[(-1.48,1.60),(-.60,1.43),(.35,1.27),(1.20,1.10),(2.30,.91)]
    window=list(reversed([(x,z+.24) for x,z in chute]+[(x,z-.24) for x,z in reversed(chute)]))
    cutter=profile(window,.90,WHITE,name='Continuous coin window',bevel=.055);cutter.rotation_euler.x=math.pi/2
    cut(body,cutter)
    backing=profile(window,.07,'#202624',name='Dark internal coin chute',bevel=.025);backing.rotation_euler.x=math.pi/2;backing.location.y=.23
    curve([(x,.07,z-.22) for x,z in chute],.035,'#181c1b',name='Descending coin guide')
    cyl((2.70,.05,.31),.72,.10,'#202424',bevel=.025,n=72,name='Black round collection tray floor')
    lathe((2.70,.05,.36),[(.72,-.05),(.72,.13),(.62,.13),(.62,-.01)],'#252a29',n=72,name='Black round collection tray wall')
    destinations=[(2.48,-.18,.40),(2.83,-.10,.40),(2.51,.17,.40),(2.82,.22,.40)]
    for i,color in enumerate((YELLOW,ORANGE,PINK,CYAN)):
        coin=empty(f'Rolling coin {i+1}')
        cyl((0,0,0),.18,.11,color,coin,bevel=.022,n=64,name='Round play coin')
        torus((0,0,.057),.135,.008,'#fff1ba',coin,name='Coin face rim')
        curve([(-.055,-.065,.061),(.055,.065,.061)],.010,'#fff1ba',coin,name='Coin rolling marker')
        source=(-2.05+i*.57,-1.42,.13);start=.70+i*2.20
        key(coin,0,loc=source,rot=(0,0,0));key(coin,start,loc=source,rot=(0,0,0))
        key(coin,start+.55,loc=(-2.66,-.24,3.13),rot=(math.pi/2,0,0))
        key(coin,start+.85,loc=(-2.23,0,2.98),rot=(math.pi/2,.4,0))
        key(coin,start+1.20,loc=(-1.95,0,2.43),rot=(math.pi/2,2.0,0))
        for offset,(x,z) in zip((1.55,2.00,2.45,2.85,3.10),chute):
            key(coin,start+offset,loc=(x,0,z),rot=(math.pi/2,2+(x+1.48)/.18,0))
        key(coin,start+3.32,loc=(2.68,.02,.80),rot=(math.pi/2,24,0))
        key(coin,start+3.57,loc=(destinations[i][0],destinations[i][1],.51),rot=(.65,.3,i*.8))
        key(coin,start+3.85,loc=destinations[i],rot=(0,0,i*.8))
        for fcurve in coin.animation_data.action.fcurves:
            for point in fcurve.keyframe_points:point.interpolation='LINEAR'
    for i,color in enumerate(('#76533e','#76533e',PINK,GREEN,CYAN)):
        x,z=coord((360+i*49,427+max(0,i-2)*11))
        points=[(x-.17,z),(x-.19,z+.23),(x,z+.37),(x+.18,z+.23),(x+.16,z)]
        plate=profile(points,.14,color,bevel=.025,name='Dinosaur back shape');plate.rotation_euler.x=math.pi/2;plate.location.y=.015
    x,z=coord((286,312))
    sphere((x,-.11,z),(.17,.03,.17),INK);sphere((x,-.143,z),(.135,.015,.135),'#d9f1e2');sphere((x+.025,-.164,z-.005),(.065,.015,.077),INK)
    mouth=profile([coord(p) for p in ((198,327),(251,350),(214,361))],.025,INK,bevel=.01);mouth.rotation_euler.x=math.pi/2;mouth.location.y=.18
    x,z=coord((226,353));sphere((x,-.13,z),(.11,.016,.035),PINK)

def stacker():
    stage_scene((0,0,1.65),8.0,-28,30)
    box((0,0,.15),(5.8,1.70,.30),'#84cdd1',.20,name='Rounded turquoise stacker base')
    columns=[(-1.85,'square',['#84cdd1','#ed9345','#f0cc40']),
             (0,'hex',['#f0cc40','#ed9345','#dda3b6','#84cdd1','#a58ac4']),
             (1.85,'circle',['#ed9345','#a58ac4','#84cdd1','#f0cc40','#dda3b6'])]
    pitch=.48;bottom=.29;top=3.38;n=72;m=292
    for column,(x,kind,colors) in enumerate(columns):
        verts=[];faces=[]
        # Broad, smooth helical ridges match the rounded yellow reference posts.
        for iz in range(m+1):
            z=bottom+(top-bottom)*iz/m
            for j in range(n):
                theta=j*math.tau/n
                ridge=((1+math.cos(theta-(z-bottom)*math.tau/pitch))/2)**2.4
                radius=.195+.125*ridge
                verts.append((x+radius*math.cos(theta),radius*math.sin(theta),z))
        for iz in range(m):
            for j in range(n):
                k=(j+1)%n
                faces.append((iz*n+j,iz*n+k,(iz+1)*n+k,(iz+1)*n+j))
        faces.extend((tuple(range(n-1,-1,-1)),tuple(m*n+j for j in range(n))))
        post=mesh('Chunky rounded yellow screw post',verts,faces,'#f1cb35')
        post.data.polygons[-1].use_smooth=False;post.data.polygons[-2].use_smooth=False
        for i,color in enumerate(colors):
            block=ring((0,0,0),.55 if kind=='square' else .53 if kind=='hex' else .59,.34,.48,color,kind=kind,n=72)
            block.name=f'{kind.title()} nut {i+1}'
            start=.55+i*1.46+column*.12;end=start+3.60;target=.30+.24+i*.48
            visible(block,start,12.2)
            key(block,start,loc=(x,0,3.64),rot=(0,0,(3.64-target)*math.tau/pitch))
            key(block,end,loc=(x,0,target),rot=(0,0,0))
            for fcurve in block.animation_data.action.fcurves:
                for point in fcurve.keyframe_points:point.interpolation='LINEAR'


def wooden_face():
    head=cyl((0,0,.27),1.10,.13,CREAM,n=96,bevel=.025,name='Wooden face board');head.scale.y=1.10
    for s in (-1,1):sphere((s*1.07,0,.27),(.23,.28,.075),CREAM)
    curve(arc(0,0,1.10,1.21,0,math.tau,.343),.014,'#6b553a',cyclic=True)
    for s in (-1,1):
        sphere((s*.40,.03,.354),(.145,.205,.018),INK)
        sphere((s*.40-.043,.105,.375),(.037,.058,.009),WHITE)
        curve(arc(s*.40,.23,.19,.11,.08,math.pi-.08,.353),.016,INK)
    curve(arc(0,-.22,.105,.07,0,math.pi,.353),.013,INK)
    curve(arc(0,-.30,.48,.33,math.pi+.12,math.tau-.12,.353),.016,INK)
    roots=[]
    for i in range(10):
        a=math.radians(25+i*130/9);p=(1.03*math.cos(a),1.14*math.sin(a),.34);roots.append(p)
        cutter=cyl((p[0],p[1],.28),.047,.40,WHITE,bevel=0,n=24);cut(head,cutter)
    return roots

def scissors(parent):
    halves=[]
    for s in (-1,1):
        half=empty('Scissor half',loc=(0,0,(s+1)*.018),parent=parent)
        blade=profile([(-.86,-.025),(-.08,-.075),(.29,-.055),(.30,.045),(-.82,.08)],.040,'#b2bfc1',half,bevel=.012)
        handle=ring((.64,0,0),.225,.145,.075,'#428ac0',half);handle.scale=(1.30,.84,1)
        box((.31,0,0),(.40,.12,.07),'#428ac0',.035,half)
        halves.append(half)
    cyl((0,0,.11),.075,.055,'#d8ddda',parent,bevel=.015)
    return halves

def hair_cutting():
    stage_scene((0,.3,.28),8.6,14,61)
    box((0,.15,.06),(4.65,4.65,.13),'#eddbb9',.20)
    for x,y,sx,sy in ((0,2.35,4.6,.12),(0,-2.05,4.6,.12),(-2.3,.15,.12,4.3),(2.3,.15,.12,4.3)):
        box((x,y,.18),(sx,sy,.28),'#e4cca2',.075)
    roots=wooden_face()
    for i,root in enumerate(roots):
        direction=Vector((root[0],root[1],0)).normalized();length=.80+.12*(i%3)
        cutpoint=Vector(root)+direction*.37
        def wavy(a,b,phase):
            return [tuple(Vector(a).lerp(Vector(b),j/35)+Vector((math.sin(j*.9+phase)*.024,math.cos(j*.9+phase)*.024,.018*math.sin(j*.5)))) for j in range(36)]
        for k in range(2):curve(wavy(root,cutpoint,k),.017,'#ae8a59',name='Attached yarn')
        detached=empty('Cut yarn end')
        end=Vector(root)+direction*length
        for k in range(2):curve(wavy(cutpoint,end,k+1),.017,'#ae8a59',detached,name='Yarn end')
        t=2.3+i*.43
        key(detached,0,loc=(0,0,0));key(detached,t,loc=(0,0,0));key(detached,t+.8,loc=(.15*math.sin(i),-1.85-cutpoint.y,-.19),rot=(0,0,.6*math.sin(i)))
    tool=empty('Scissors');halves=scissors(tool)
    key(tool,0,loc=(1.5,-1.65,.35),rot=(0,0,-.7));key(tool,1.9,loc=(1.5,-1.65,.35),rot=(0,0,-.7))
    for i,root in enumerate(roots):
        direction=Vector((root[0],root[1],0)).normalized();p=Vector(root)+direction*.37;t=2.3+i*.43
        key(tool,t-.17,loc=(p.x+.76,p.y,.40),rot=(0,0,0))
        key(tool,t+.04,loc=(p.x+.76,p.y,.40),rot=(0,0,0))
        for s,half in zip((-1,1),halves):key(half,t-.15,rot=(0,0,s*.42));key(half,t,rot=(0,0,s*.035));key(half,t+.18,rot=(0,0,s*.42))
    key(tool,7.2,loc=(1.55,-1.55,.35),rot=(0,0,-.7))

def hair_beading():
    stage_scene((0,.55,.25),8.6,18,59)
    roots=wooden_face();cords=[]
    for i in range(6):
        root=roots[min(9,i*2)]
        a=math.atan2(root[1],root[0]);end=(2.5*math.cos(a),2.75*math.sin(a),.45)
        pts=[root,(root[0]*1.25,root[1]*1.25,.46),(end[0]+.16*math.sin(i),end[1]-.30,.40),end]
        curve([bezier(pts,j/60) for j in range(61)],.035,'#eee7d6',name='White hair cord');cords.append(pts)
    box((-1.85,-1.55,.12),(1.55,1.1,.15),'#e2e5dc',.10)
    for i,c in enumerate((PINK,YELLOW,CYAN,WHITE,PURPLE,GREEN)):
        x=-2.33+i%3*.48;y=-1.83+i//3*.5
        box((x,y,.23),(.42,.43,.10),WHITE,.035)
        for j in range(3):ring((x-.1+j%2*.18,y-.1+j//2*.16,.33),.075,.032,.10,c,n=24)
    colors=[PINK,YELLOW,CYAN,GREEN,YELLOW,GREEN,PURPLE,PINK,PURPLE]
    for i,color in enumerate(colors):
        p=cords[(i%3)*2];level=i//3;start=.6+i*.72
        bead=ring((0,0,0),.13,.059,.18,color,n=36)
        source=(-2.3+i%3*.43,-1.80+i//3*.24,.4)
        key(bead,0,loc=source);key(bead,start,loc=source);key(bead,start+.35,loc=p[-1])
        target=.34+level*.16
        for j in range(8):
            u=1-(1-target)*j/7;point=bezier(p,u);q=bezier(p,max(0,u-.012))
            orient(bead,Vector(q)-Vector(point));key(bead,start+.35+j/7*1.1,loc=point,rot=tuple(bead.rotation_euler))

def donut_part(loc,major=.9,minor=.29,parent=None):
    torus(loc,major,minor,'#c8935e',parent,scale=(1,1,.82),name='Baked donut')
    torus((loc[0],loc[1],loc[2]+minor*.70),major,minor*.98,WHITE,parent,scale=(1,1,.50),name='White icing')

def flower3d(parent,color,r=.16):
    for k in range(5):
        a=k*math.tau/5
        sphere((r*.55*math.cos(a),r*.55*math.sin(a),0),(r*.47,r*.47,.045),color,parent,n=20)
    sphere((0,0,.025),(.045,.045,.035),YELLOW,parent,n=20)

def donut():
    stage_scene((0,.1,.35),8.5,20,53)
    board=box((.0,1.15,.13),(3.8,2.30,.23),'#d5b58b',.12)
    for i,(x,y) in enumerate(((-.94,.60),(.94,.60),(-.94,1.68),(.94,1.68))):
        cutter=cyl((x,y,.265),.64,.14,WHITE,bevel=0,n=64);cut(board,cutter)
        cyl((x,y,.188),.615,.014,'#b49368',bevel=0)
        if i!=1:donut_part((x,y,.32),.43,.16)
    donut_part((.30,-.55,.41),.94,.30)
    # Six compartments with separate colorful pieces, as in the catalog photo.
    box((-.2,-2.05,.16),(3.8,.85,.20),'#e7e8e0',.09)
    for i,color in enumerate((CYAN,YELLOW,ORANGE,GREEN,PINK,PURPLE)):
        x=-1.72+i*.61
        box((x,-2.05,.29),(.54,.72,.10),WHITE,.055)
        for j in range(2):
            p=empty('Spare decoration',loc=(x-.10+j*.19,-2.12+j*.13,.37));flower3d(p,color,.11)
    for i,color in enumerate((ORANGE,YELLOW,CYAN,PINK,GREEN,PURPLE,YELLOW,CYAN)):
        group=empty('Moving donut decoration');flower3d(group,color,.19)
        a=math.pi/2+i*math.tau/8;dest=(.30+.94*math.cos(a),-.55+.94*math.sin(a),.83)
        source=(-1.72+i%6*.61,-2.05,.46);start=.55+i*.85
        key(group,0,loc=source);key(group,start,loc=source)
        key(group,start+.46,loc=(dest[0],dest[1],1.55),rot=(0,0,.7))
        key(group,start+1.0,loc=dest,rot=(0,0,0))

def cash_register():
    stage_scene((-.35,-.25,1.10),8.8,26,35)
    body=profile([(-.95,.18),(.95,.18),(.95,2.45),(-.95,.50)],3.05,CYAN,bevel=.10,name='Sloped cash register body')
    body.rotation_euler=(math.pi/2,0,math.pi/2)
    angle=math.atan2(1.95,1.90);face=empty('Sloping keypad',loc=(0,0,1.48));face.rotation_euler.x=angle
    box((0,0,0),(2.91,2.67,.10),'#eac69f',.08,face)
    for row in range(3):
        for col in range(3):
            number=row*3+col+1;x=-.91+col*.54;y=.67-row*.49
            button=empty('Number button',loc=(x,y,.09),parent=face)
            cyl((0,0,0),.205,.12,'#264d6c',button,bevel=.035)
            text(str(number),(0,-.015,.069),.25,WHITE,button)
            if number in (2,3):
                t=2.5 if number==2 else 3.5
                key(button,0,loc=(x,y,.09));key(button,t-.1,loc=(x,y,.09));key(button,t+.05,loc=(x,y,.045));key(button,t+.25,loc=(x,y,.09))
    cyl((-.35,-.85,.10),.205,.12,'#264d6c',face,bevel=.035);text('0',(-.35,-.865,.17),.25,WHITE,face)
    box((-.35,-1.14,.10),(1.60,.24,.13),ORANGE,.06,face)
    for i,(color,label) in enumerate((('#d76c53','+'),(YELLOW,'='),('#4382ad',''),(GREEN,'$'))):
        x,y=.96,.73-i*.53
        box((x,y,.11),(.55,.40,.16),color,.08,face)
        text(label,(x,y-.015,.20),.25,WHITE,face)
    display=empty('Display panel',loc=(0,.91,2.73));display.rotation_euler.x=math.radians(66)
    box((0,0,0),(1.92,.65,.18),'#72b4d3',.12,display)
    box((0,0,.102),(1.64,.43,.02),'#172e35',.045,display)
    for val,start,end in (('2',2.5,3.5),('3',3.5,4.7),('5',4.7,10.2)):
        label=text(val,(.62,0,.12),.37,'#e3efba',display,align='RIGHT');visible(label,start,end)
    drawer=empty('Sliding coin drawer')
    box((0,0,.20),(2.96,1.45,.13),'#dbb58c',.06,drawer)
    for x,y,sx,sy in ((0,.67,2.9,.09),(0,-.67,2.9,.09),(-1.44,0,.09,1.4),(1.44,0,.09,1.4),(0,0,.09,1.4)):
        box((x,y,.35),(sx,sy,.26),'#ecd5ad',.025,drawer)
    box((0,-.73,.36),(3.10,.13,.39),CYAN,.06,drawer)
    box((0,-.81,.39),(.95,.05,.08),'#5b9eb9',.035,drawer)
    key(drawer,0,loc=(0,-.30,0));key(drawer,5.6,loc=(0,-.30,0));key(drawer,6.25,loc=(0,-1.60,0))
    for i,(color,value) in enumerate(((YELLOW,'2'),(PURPLE,'3'))):
        coin=empty('Toy payment coin')
        cyl((0,0,0),.32,.095,color,coin,bevel=.025)
        torus((0,0,.052),.26,.013,WHITE,coin)
        text(value,(0,-.015,.055),.33,WHITE,coin)
        source=(-2.4+i*.80,-1.90,.13);dest=(-.72+i*1.45,-1.60,.37)
        start=6.4+i*.85;key(coin,0,loc=source);key(coin,start,loc=source)
        key(coin,start+.5,loc=(dest[0],dest[1],1.15),rot=(0,.3,.8));key(coin,start+1.05,loc=dest,rot=(0,0,0))
    box((-2.4,-.20,.36),(1.0,.86,.70),'#895c3f',.15)
    for i in range(5):box((-2.7+i*.12,-.20,.72),(.045,.50,.012),'#e0ccab',.005)
    card=empty('Blue toy payment card',loc=(-2.3,-1.04,.15))
    box((0,0,0),(.85,.65,.045),'#287cab',.07,card)
    box((-.20,.10,.03),(.21,.17,.012),YELLOW,.018,card)
    for i in range(3):curve(arc(.13,.06,.10+i*.055,.10+i*.055,-.9,.9,.031,n=15),.009,WHITE,card)
    apple=empty('Pretend grocery apple')
    sphere((-.10,0,0),(.24,.27,.26),'#da6e51',apple);sphere((.10,0,0),(.24,.27,.26),'#e08059',apple)
    cyl((0,0,.29),.032,.20,'#82603d',apple,bevel=.01)
    leaf=sphere((.14,0,.34),(.18,.075,.035),GREEN,apple);leaf.rotation_euler.y=.3
    key(apple,0,loc=(-2.7,-1.45,.42));key(apple,.6,loc=(-2.7,-1.45,.42));key(apple,1.8,loc=(-2.42,-.20,1.02));key(apple,2.2,loc=(-2.42,.80,.35))

def shoe():
    stage_scene((0,0,.62),7.5,30,46)
    sole=cyl((0,0,.12),1,.18,'#9574bb',bevel=.07,n=96);sole.scale=(.96,1.79,1)
    sphere((0,-.66,.49),(.88,1.04,.43),PURPLE,n=48,name='Rounded closed toe')
    box((0,.40,.46),(1.63,1.72,.63),PURPLE,.28)
    lathe((0,.73,1.01),[(.76,.51),(.81,.28),(.82,-.48),(.67,-.50),(.64,.47)],PURPLE,name='Open ankle collar')
    # A thin edge above the opening gives the toy a visible rim and wall thickness.
    torus((0,.73,1.51),.70,.060,'#bca1d7',scale=(1,1,1),name='Collar rim')
    face=empty('Lacing panel',loc=(0,-.50,.84));face.rotation_euler.x=math.radians(35)
    box((0,0,.0),(.64,1.98,.13),'#b294d0',.14,face)
    pairs=[(-.51,-.75),(-.51,-.25),(-.51,.25),(-.51,.75)]
    for s in (-1,1):
        panel=box((s*.54,0,.03),(.30,2.03,.16),PURPLE,.09)
        for y in (-.75,-.25,.25,.75):
            cutter=cyl((s*.54,y,.03),.068,.40,WHITE,bevel=0,n=32);cut(panel,cutter)
            torus((s*.54,y,.13),.086,.023,'#c4aadd',face,name='Lace eyelet')
        panel.parent=face
    lower=curve([(-.54,-.75,.15),(.54,-.75,.15)],.034,'#f2e2c3',face,name='First lacing pair')
    lower.data.bevel_factor_end=0;lower.data.keyframe_insert('bevel_factor_end',frame=1)
    lower.data.bevel_factor_end=1;lower.data.keyframe_insert('bevel_factor_end',frame=36)
    for s in (-1,1):
        points=[(s*.54,-.75,.16),(-s*.54,-.25,.18),(s*.54,.25,.18),(-s*.54,.75,.18),(-s*1.05,1.02,.10),(-s*1.55,.55,-.60)]
        # Subdivide the final loose end into a rounded drape.
        cord=curve(points,.034,'#f2e2c3',face,name='Crossed shoelace')
        cord.data.bevel_factor_end=0;cord.data.keyframe_insert('bevel_factor_end',frame=30+(s+1)*4)
        cord.data.bevel_factor_end=1;cord.data.keyframe_insert('bevel_factor_end',frame=186+(s+1)*4)
        tip=cyl(points[-1],.037,.15,'#d7c6a9',face,bevel=.012,n=24);orient(tip,Vector(points[-1])-Vector(points[-2]));visible(tip,8.2,10.2)
    # A subtle molded seam on the toe is geometry as well.
    curve([(math.cos(a)*.84,-.66+math.sin(a)*.88,.34) for a in [math.pi+i*math.pi/40 for i in range(41)]],.012,'#c1a5dd',name='Toe seam')
