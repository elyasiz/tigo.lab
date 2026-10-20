"""Render original instructional illustrations; no product photos are animated/retouched.

Requires Pillow and FFmpeg (or imageio-ffmpeg). Run from any directory:
  python tools/render_product_demos.py --preview
  python tools/render_product_demos.py --all
"""
from pathlib import Path
import argparse, json, math, os, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'dist/assets'
OUT=ASSETS/'videos'
QA=Path(os.environ.get('TIGO_DEMO_QA',str(ROOT/'tmp/demo-previews')))
OUT.mkdir(exist_ok=True); QA.mkdir(parents=True,exist_ok=True)
W=960; FPS=24; DURATION=10
PAPER='#fffefa'; SAGE='#eff2e5'; INK='#23463e'
CYAN='#86ccd3'; GREEN='#55ba79'; YELLOW='#f1ce4c'; ORANGE='#ef9a4c'; PINK='#dfa4b8'; PURPLE='#aa8bc8'; CREAM='#f4e5c4'
COLORS=[YELLOW,GREEN,PINK,CYAN,ORANGE,PURPLE]
FONT_DIR=Path(os.environ.get('TIGO_FONT_DIR','C:/Windows/Fonts'))
FONTS={}

DEMOS={
'M01':dict(slug='train',name='Build-a-Train Play',title='Rakit, putar, jalankan.',description='Pasang roda, putar pengencang dengan obeng mainan, lalu dorong keretanya.',steps=['Pasang roda pada poros.','Putar pengencang dengan obeng mainan.','Dorong kereta yang sudah dirakit.'],breaks=[3.7,7.0]),
'M02':dict(slug='beads',name='Geometric Bead Threading',title='Masukkan, geser, rangkai.',description='Masukkan bentuk geometri ke ujung tali dan geser menjadi rangkaian warna.',steps=['Pilih bentuk dan warna.','Masukkan ujung tali ke lubang manik.','Geser dan ulangi pola warna.'],breaks=[1.8,5.6]),
'M03':dict(slug='funnel',name='Sensory Funnel Play',title='Sendok, tuang, amati.',description='Pindahkan bahan permainan dengan sendok dan amati alirannya melalui corong.',steps=['Ambil bahan permainan dengan sendok.','Tuang perlahan ke corong.','Amati bahan terkumpul di wadah.'],breaks=[1.7,6.8]),
'M04':dict(slug='dino',name='Feed the Dino',title='Pilih, cocokkan, pasang.',description='Cocokkan keping berwarna dengan urutan slot pada media dinosaurus.',steps=['Pilih keping warna.','Cocokkan dengan slot pada dinosaurus.','Lengkapi urutan warna satu per satu.'],breaks=[1.6,5.7]),
'M05':dict(slug='hair-cutting',name='Hair Cutting Practice',title='Rapikan, gunting, coba lagi.',description='Latih gerakan menggunting pada benang rambut permainan dengan pendampingan.',steps=['Rapikan benang rambut permainan.','Gunting beberapa helai benang.','Coba potongan dengan panjang berbeda.'],breaks=[2.0,7.5]),
'M06':dict(slug='donut',name='Donut Decorating Play',title='Pilih warna, hias donat.',description='Pilih elemen dekorasi dan susun menjadi hiasan donat sesuai ide sendiri.',steps=['Pilih warna dan hiasan.','Pasangkan hiasan pada donat.','Coba kombinasi dekorasi yang berbeda.'],breaks=[1.6,6.7]),
'M07':dict(slug='hair-beading',name='Hair Beading Activity',title='Ronce rambut warna-warni.',description='Masukkan manik ke ujung tali rambut dan geser untuk menyusun pola warna.',steps=['Pilih warna manik.','Masukkan manik ke ujung tali rambut.','Geser dan rangkai pola warnanya.'],breaks=[1.7,5.7]),
'M08':dict(slug='cash-register',name='Pretend Grocery Cash Register',title='Belanja kecil, cerita besar.',description='Pilih barang mainan, tekan angka pada kasir, lalu bermain membayar dengan koin.',steps=['Pilih barang belanja mainan.','Tekan angka pada kasir mainan.','Bayar dan simpan koin mainan.'],breaks=[2.5,5.6]),
'M10':dict(slug='shoe',name='Shoe Lacing Trainer',title='Masukkan, silangkan, rapikan.',description='Masukkan tali melalui sepasang lubang lalu silangkan ke pasangan lubang berikutnya.',steps=['Masukkan tali ke sepasang lubang bawah.','Silangkan ke lubang berikutnya.','Ulangi dan rapikan susunan tali.'],breaks=[2.0,6.7]),
}

def font(size,bold=False):
    key=(size,bold)
    if key not in FONTS:
        name='arialbd.ttf' if bold else 'arial.ttf'
        path=FONT_DIR/name
        if not path.exists(): path=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf')
        FONTS[key]=ImageFont.truetype(str(path),size)
    return FONTS[key]

def clamp(x): return max(0.,min(1.,x))
def ease(x): x=clamp(x); return x*x*(3-2*x)
def lerp(a,b,u): return a+(b-a)*u
def pos(a,b,u): return (lerp(a[0],b[0],u),lerp(a[1],b[1],u))
def shade(c,k):
    c=c.lstrip('#'); return tuple(round(int(c[i:i+2],16)*k) for i in (0,2,4))
def circle(d,x,y,r,fill,outline=None,width=1): d.ellipse((x-r,y-r,x+r,y+r),fill=fill,outline=outline,width=width)
def rr(d,box,color,r=20,outline=None,width=1): d.rounded_rectangle(box,radius=r,fill=color,outline=outline,width=width)
def line(d,pts,color,width=5): d.line(pts,fill=color,width=width,joint='curve')
def curve(pts,n=45):
    result=[]
    for i in range(n+1):
        u=i/n; a=1-u
        result.append((a**3*pts[0][0]+3*a*a*u*pts[1][0]+3*a*u*u*pts[2][0]+u**3*pts[3][0],a**3*pts[0][1]+3*a*a*u*pts[1][1]+3*a*u*u*pts[2][1]+u**3*pts[3][1]))
    return result
def cp(pts,u):
    u=clamp(u); a=1-u
    return (a**3*pts[0][0]+3*a*a*u*pts[1][0]+3*a*u*u*pts[2][0]+u**3*pts[3][0],a**3*pts[0][1]+3*a*a*u*pts[1][1]+3*a*u*u*pts[2][1]+u**3*pts[3][1])
def disc(d,x,y,r,color):
    d.ellipse((x-r,y-r+12,x+r,y+r+12),fill=shade(color,.76))
    circle(d,x,y,r,color); d.arc((x-r+6,y-r+6,x+r-6,y+r-6),200,310,fill=shade(color,1.08),width=3)
def block(d,box,color,r=15,depth=14):
    x1,y1,x2,y2=box; rr(d,(x1,y1+depth,x2,y2+depth),shade(color,.77),r); rr(d,box,color,r)
    line(d,[(x1+r,y1+3),(x2-r,y1+3)],shade(color,1.09),3)
def plus(d,x,y,r,color,angle=0,width=8):
    for a in (angle,angle+math.pi/2):
        dx,dy=r*math.cos(a),r*math.sin(a);line(d,[(x-dx,y-dy),(x+dx,y+dy)],color,width)
def flower(d,x,y,r,color):
    for k in range(5):
        a=k*2*math.pi/5-math.pi/2; circle(d,x+math.cos(a)*r*.53,y+math.sin(a)*r*.53,r*.42,shade(color,.78))
    for k in range(5):
        a=k*2*math.pi/5-math.pi/2; circle(d,x+math.cos(a)*r*.53,y-3+math.sin(a)*r*.53,r*.42,color)
    circle(d,x,y-3,r*.22,YELLOW)
def face(d,cx,cy,r=130):
    for s in (-1,1): circle(d,cx+s*r*.95,cy,27,CREAM,INK,3)
    d.ellipse((cx-r,cy-r*1.10,cx+r,cy+r),fill=shade(CREAM,.8))
    d.ellipse((cx-r,cy-r*1.15,cx+r,cy+r-7),fill=CREAM,outline=INK,width=3)
    for s in (-1,1):
        ex=cx+s*r*.38; ey=cy-5
        d.arc((ex-25,ey-35,ex+25,ey-13),180,350,fill=INK,width=3)
        d.ellipse((ex-16,ey-15,ex+16,ey+24),fill=INK);circle(d,ex-5,ey-4,5,'#fffefa')
    d.arc((cx-11,cy+20,cx+11,cy+38),180,360,fill=INK,width=3)
    d.arc((cx-50,cy+18,cx+50,cy+80),10,170,fill=INK,width=4)

def train(d,t):
    shift=105*ease((t-7.4)/1.4)
    ox=-35+shift; oy=40
    def p(x,y):return x+ox,y+oy
    d.ellipse((170+ox,696,787+ox,747),fill='#d8ddcd')
    block(d,(205+ox,565+oy,755+ox,620+oy),ORANGE,26)
    block(d,(248+ox,340+oy,420+ox,565+oy),CYAN,22)
    rr(d,(275+ox,375+oy,333+ox,455+oy),'#bfdfe0',9)
    rr(d,(349+ox,375+oy,401+ox,455+oy),'#527a79',9)
    block(d,(225+ox,303+oy,438+ox,347+oy),GREEN,28)
    block(d,(416+ox,441+oy,717+ox,566+oy),PURPLE,34)
    d.ellipse((673+ox,443+oy,753+ox,565+oy),fill=ORANGE)
    d.ellipse((690+ox,459+oy,736+ox,549+oy),fill=shade(ORANGE,.83))
    block(d,(539+ox,353+oy,594+ox,447+oy),ORANGE,10)
    d.ellipse((526+ox,344+oy,607+ox,375+oy),fill='#ffb167')
    d.ellipse((543+ox,350+oy,589+ox,366+oy),fill=shade(ORANGE,.65))
    for i,(x,y) in enumerate(((287,620),(631,620))):
        u=ease((t-.6-i*1.50)/1.25); start=(200+i*505,764)
        wx,wy=pos(start,p(x,y),u)
        disc(d,wx,wy,64,YELLOW)
        circle(d,wx,wy,32,shade(GREEN,.75)); circle(d,wx,wy-2,27,GREEN)
        angle=(t*3 if t>7.3 else t*2 if 3.9<t<6.7 else 0)
        plus(d,wx,wy-2,17,shade(GREEN,.55),angle,8)
    if 3.5<t<7.15:
        u=ease((t-3.5)/.65)*(1-ease((t-6.6)/.5)); target=p(631,620)
        tip=pos((884,754),(target[0]+17,target[1]+3),u)
        line(d,[tip,(tip[0]+102,tip[1]+34)],'#a9b9bb',15)
        block(d,(tip[0]+86,tip[1]+13,tip[0]+194,tip[1]+65),PINK,19)
        for k in (0,1,2):line(d,[(tip[0]+115+k*17,tip[1]+24),(tip[0]+110+k*17,tip[1]+55)],shade(PINK,.82+.12*math.sin(t*13)),5)

CORD=[(760,306),(850,510),(270,365),(230,651)]
def bead(d,x,y,color,kind='circle',r=43,angle=0):
    if kind=='circle': disc(d,x,y,r,color)
    else:
        n=3 if kind=='triangle' else 4
        a0=angle-math.pi/2 if n==3 else angle+math.pi/4
        points=[(x+math.cos(a0+k*2*math.pi/n)*r*1.2,y+math.sin(a0+k*2*math.pi/n)*r*1.2) for k in range(n)]
        d.polygon([(a,b+12) for a,b in points],fill=shade(color,.74));d.polygon(points,fill=color)
    circle(d,x,y,r*.26,shade(color,.63));circle(d,x,y-3,r*.21,SAGE)

def beads(d,t):
    line(d,curve(CORD),'#cfbd94',15);line(d,curve(CORD),'#f6e6c7',9)
    disc(d,230,651,29,'#447fa2')
    line(d,[(760,306),(744,265)],'#417fb0',13)
    kinds=['square','triangle','circle','square','circle']
    for i in range(5):
        start=.6+i*1.35; u=clamp((t-start)/1.6)
        target=.91-i*.15
        if t<start:
            x,y=300+i*102,757
            bead(d,x,y,COLORS[i],kinds[i],34); continue
        if u<.24: x,y=pos((300+i*102,757),(744,265),ease(u/.24)); a=0
        else:
            v=target*ease((u-.24)/.76); x,y=cp(CORD,v);a=v*2.8
        bead(d,x,y,COLORS[i],kinds[i],42,a)
        # A short visible section of cord runs through the central hole.
        if u>=.24:
            q=cp(CORD,max(0,v-.006));r=cp(CORD,min(1,v+.006));line(d,[q,r],'#f6e6c7',7)

def spoon(d,x,y,angle=0,filled=True):
    dx,dy=math.cos(angle),math.sin(angle)
    line(d,[(x+dx*20,y+dy*20),(x+dx*125,y+dy*125)],CYAN,25)
    d.ellipse((x-38,y-24,x+38,y+24),fill=shade(CYAN,.77));d.ellipse((x-35,y-24,x+35,y+17),fill=CYAN)
    if filled:
        for j in range(19):circle(d,x-24+(j*17%48),y-13+(j*11%22),4,['#d9b06c','#e8c98c','#f2d69c'][j%3])

def funnel(d,t):
    for x in (220,720):block(d,(x,340,x+35,736),CYAN,14)
    block(d,(208,681,764,722),CYAN,15);block(d,(210,353,765,385),CYAN,13)
    for i,x in enumerate((320,487,654)):
        start=1.05+i*2.15; progress=clamp((t-start-.50)/1.25)
        # Catching bucket and the increasing amount of poured material.
        block(d,(x-57,565,x+57,673),'#99ca50',17)
        d.ellipse((x-57,548,x+57,583),fill='#6c9d39')
        level=576-20*progress
        if progress>0:d.ellipse((x-47,level-5,x+47,level+13),fill='#dbc28a')
        for j in range(int(24*progress)):
            circle(d,x-40+(j*29%80),level+(j*13%13),3,['#d8b171','#e7ce93'][j%2])
        # Funnel remains open, with the neck visible beneath it.
        d.polygon([(x-65,337),(x+65,337),(x+25,427),(x-25,427)],fill='#a5d251')
        rr(d,(x-17,415,x+17,461),'#8dbe44',7)
        d.ellipse((x-65,319,x+65,354),fill='#b7de62');d.ellipse((x-53,325,x+53,347),fill='#739d35')
        if start<t<start+1.75:
            v=clamp((t-start)/.6); sx,sy=pos((170,755),(x-17,272),ease(v))
            spoon(d,sx,sy,-.2,filled=t<start+.75)
            if t>start+.55:
                for j in range(24):
                    phase=((t-start-.55)*.85+j/24)%1
                    yy=305+phase*264
                    if 357<yy<461: continue
                    circle(d,x+math.sin(j*8)*11,yy,3.8,['#d9b06c','#ead092'][j%2])
    d.ellipse((91,731,250,791),fill=shade(CYAN,.75));d.ellipse((91,718,250,778),fill=CYAN)
    d.ellipse((103,725,239,765),fill='#dfc287')
    for j in range(32):circle(d,115+(j*37%111),733+(j*19%24),3,['#d4ab66','#f3d89e'][j%2])

DINO_PATH=[]
def dino_outline():
    segments=[[(220,562),(203,486),(199,420),(226,366)],[(226,366),(242,322),(214,287),(184,298)],
      [(184,298),(215,245),(302,252),(327,319)],[(327,319),(346,354),(330,408),(351,443)],
      [(351,443),(477,410),(607,434),(657,501)],[(657,501),(715,563),(747,589),(811,555)],
      [(811,555),(812,612),(693,635),(641,623)],[(641,623),(610,655),(581,649),(576,617)],
      [(576,617),(548,623),(529,625),(508,623)],[(508,623),(510,671),(452,673),(451,625)],
      [(451,625),(421,625),(394,621),(368,612)],[(368,612),(371,661),(319,658),(317,607)],
      [(317,607),(280,595),(243,583),(220,562)]]
    return [p for seg in segments for p in curve(seg,12)]
DINO_PATH=dino_outline()
def dino(d,t):
    block(d,(198,640,814,692),'#45514b',25)
    d.polygon([(x+8,y+11) for x,y in DINO_PATH],fill=shade(GREEN,.75));d.polygon(DINO_PATH,fill=GREEN)
    line(d,DINO_PATH+[DINO_PATH[0]],INK,4)
    circle(d,286,312,19,'#dcf3ea',INK,3);circle(d,291,313,9,INK)
    d.polygon([(198,327),(251,350),(214,361)],fill=INK)
    d.ellipse((208,345,243,360),fill=PINK)
    for i in range(5):
        x=360+i*49;y=431+max(0,i-2)*11
        pts=[(x-21,y),(x-23,y-28),(x,y-45),(x+22,y-29),(x+20,y)]
        d.polygon(pts,fill=[YELLOW,ORANGE,PINK,GREEN,CYAN][i]);line(d,pts+[pts[0]],INK,3)
    colors=[YELLOW,ORANGE,PINK,GREEN,CYAN]
    for i,color in enumerate(colors):
        x=344+i*61; circle(d,x,542,29,'#397c53');circle(d,x,539,24,'#274e3b')
    for i,color in enumerate(colors):
        u=ease((t-.65-i*1.3)/1.05);x,y=pos((260+i*105,762),(344+i*61,538),u)
        disc(d,x,y,25,color)

HAIR_ROOTS=[(332+i*32,429-34*math.sin(i*math.pi/9)) for i in range(10)]
HAIR_ENDS=[(x-25+9*(i%3),239+17*(i%4)) for i,(x,y) in enumerate(HAIR_ROOTS)]
def scissors(d,x,y,opening):
    # Blade tips face left; hinge and handles remain away from the face board.
    for s in (-1,1):
        a=s*opening;tx=x-91*math.cos(a);ty=y+91*math.sin(a)
        line(d,[(tx,ty),(x+37,y-s*18)],'#879d9f',13)
        hx=x+69*math.cos(a);hy=y-s*(23+45*math.sin(a))
        d.ellipse((hx-35,hy-22,hx+35,hy+22),fill='#477da9')
        d.ellipse((hx-22,hy-12,hx+22,hy+12),fill=SAGE)
    circle(d,x,y,10,'#d8ded9');circle(d,x,y,4,'#7b8988')

def hair_cutting(d,t):
    block(d,(196,235,788,803),'#e6d3af',36);rr(d,(214,250,771,778),'#f2e6cb',26)
    face(d,480,577,139)
    for i,(root,end) in enumerate(zip(HAIR_ROOTS,HAIR_ENDS)):
        cut_time=2.4+i*.43
        cut=t>=cut_time
        target=(end[0],337+(i%3)*10)
        tip=target if cut else end
        for k in range(3):
            off=(k-1)*3
            path=[(root[0]+off,root[1]),(root[0]-15+off,root[1]-34),(tip[0]+10+off,tip[1]+25),(tip[0]+off,tip[1])]
            line(d,curve(path),'#b79a71',4)
        circle(d,root[0],root[1],7,'#7a654e')
        if cut:
            fall=clamp((t-cut_time)/1.3)
            if fall<1:
                yy=lerp(target[1],756,ease(fall)); xx=target[0]+math.sin(fall*4+i)*30
                line(d,[(xx,yy),(xx-19,yy-65),(xx+5,yy-89)],'#b79a71',5)
            else:line(d,[(260+i*41,752),(280+i*41,735),(300+i*41,755)],'#b79a71',4)
    if 1.9<t<7.2:
        x=350+clamp((t-2.2)/4.0)*310
        scissors(d,x+75,330,.11+.32*(.5+.5*math.cos((t-2.4)*2*math.pi/.43)))
    else: scissors(d,726,693,.39)

def donut(d,t):
    block(d,(229,261,738,631),'#dac6a5',32)
    for x,y in ((320,340),(637,340),(320,551),(637,551)):
        d.ellipse((x-61,y-38,x+61,y+38),fill='#c7b08d')
    d.ellipse((295,333,665,666),fill='#b68354')
    d.ellipse((294,316,666,646),fill='#d6a875')
    d.ellipse((305,304,655,622),fill='#fff8ec',outline='#e6dfd0',width=3)
    d.ellipse((429,414,531,510),fill='#b58459');d.ellipse((437,410,523,489),fill='#b09a76')
    rr(d,(125,690,835,807),'#e5e3d9',20)
    for i,c in enumerate(COLORS):
        x=190+i*117;rr(d,(x-47,708,x+47,787),'#fffefa',13)
        flower(d,x-15,737,16,c);flower(d,x+17,758,15,c)
    for i in range(8):
        a=-math.pi/2+i*math.pi/4;dest=(480+125*math.cos(a),468+108*math.sin(a))
        u=ease((t-.65-i*.83)/.9)
        x,y=pos((190+(i%6)*117,740),dest,u)
        if i%3==2:
            disc(d,x,y,18,COLORS[i%6]);circle(d,x,y-3,5,shade(COLORS[i%6],1.08))
        else:flower(d,x,y,24,COLORS[i%6])

HAIR_CORDS=[[(363+i*47,518-23*math.sin(i*math.pi/5)),(350+i*50,427),(180+i*135,335),(180+i*126,260+18*(i%2))] for i in range(6)]
def hair_beading(d,t):
    d.ellipse((299,732,674,783),fill='#d8ddcc')
    face(d,480,644,142)
    for pts in HAIR_CORDS:
        line(d,curve(pts),'#b8c8bd',10);line(d,curve(pts),'#fffdf2',6)
        circle(d,pts[0][0],pts[0][1],7,'#695c48')
    for i in range(9):
        cord=i%3*2; level=i//3; pts=HAIR_CORDS[cord]
        start=.65+i*.72;u=clamp((t-start)/1.5)
        if u<=0:continue
        end=pts[-1]
        if u<.24: x,y=pos((173+(i%3)*58,741),end,ease(u/.24))
        else: x,y=cp(pts,1-(.64-level*.15)*ease((u-.24)/.76))
        bead(d,x,y,COLORS[i%6],'circle',19)
        line(d,[(x-2,y-5),(x+2,y+5)],'#fffdf2',4)
    rr(d,(97,688,284,793),'#deded4',16)
    for i,c in enumerate(COLORS):
        x=129+(i%3)*58;y=717+(i//3)*47
        rr(d,(x-23,y-19,x+23,y+20),'#fffefa',7)
        for j in range(3):bead(d,x-9+(j%2)*17,y-4+(j//2)*15,c,'circle',8)

def apple(d,x,y,r=35):
    circle(d,x-r*.36,y,r*.74,'#df795b');circle(d,x+r*.36,y,r*.74,'#e58964')
    line(d,[(x,y-r*.5),(x+4,y-r)],'#88683e',7)
    d.ellipse((x+4,y-r-3,x+30,y-r+13),fill=GREEN)

def cash_register(d,t):
    d.ellipse((222,711,787,781),fill='#d8ddce')
    block(d,(356,343,755,660),CYAN,25)
    d.polygon([(392,325),(719,325),(750,589),(352,589)],fill='#ebc49c')
    d.polygon([(395,334),(711,334),(738,570),(365,570)],fill='#f4d6b1')
    block(d,(435,244,671,320),'#79afcb',14)
    rr(d,(451,254,654,306),'#20373a',8)
    display='' if t<2.5 else '2' if t<3.4 else '3' if t<4.8 else '5'
    d.text((625,261),display,font=font(34,True),fill='#e5f5c3',anchor='ra')
    for r in range(3):
        for c in range(3):
            x=429+c*61;y=385+r*57
            n=r*3+c+1;active=(n==2 and 2.5<t<3.4) or (n==3 and 3.4<t<4.3)
            disc(d,x,y,23,YELLOW if active else '#305b75')
            d.text((x,y-3),str(n),font=font(22,True),fill=PAPER,anchor='mm')
            if active:
                d.ellipse((x-32,y-32,x+32,y+32),outline='#e9b84a',width=4)
    for i,c in enumerate((ORANGE,YELLOW,GREEN)):
        block(d,(632,368+i*62,695,412+i*62),c,12)
    block(d,(391,548,581,575),ORANGE,12)
    # Drawer slides toward the viewer; the compartments are exposed before payment.
    pull=68*ease((t-5.7)/.65)
    rr(d,(382,604,720,645+pull),'#d7bb94',10)
    for x in (393,553):rr(d,(x,610,x+148,640+pull),'#f7e5c6',8)
    block(d,(367,630+pull,733,673+pull),CYAN,13)
    rr(d,(482,640+pull,616,653+pull),'#61a5b7',7)
    # Brown grocery prop and toy scanner match the product's pretend-play theme.
    block(d,(161,507,287,578),'#986f50',20)
    line(d,[(182,530),(263,530)],'#e2c49c',5)
    u=ease((t-.7)/1.4);x,y=pos((122,731),(225,448),u)
    apple(d,x,y)
    for i,value in enumerate((2,3)):
        u=ease((t-6.35-i*.85)/1.15);x,y=pos((162+i*100,750),(463+i*162,652),u)
        disc(d,x,y,33,YELLOW if i==0 else PURPLE)
        d.text((x,y-1),str(value),font=font(29,True),fill=PAPER,anchor='mm')

LACING_PAIRS=[((377,572),(583,572)),((391,515),(569,515)),((402,458),(558,458)),((414,401),(546,401))]
def shoe(d,t):
    d.ellipse((251,704,708,782),fill='#d9dccc')
    outline=[(292,681),(288,576),(312,365),(368,283),(590,283),(646,365),(671,576),(666,681),(616,742),(342,742)]
    d.polygon([(x,y+17) for x,y in outline],fill='#8c72af')
    d.polygon(outline,fill=PURPLE);line(d,outline+[outline[0]],'#8c72af',7)
    d.ellipse((345,292,614,384),fill='#7a629b');d.ellipse((368,306,593,370),fill='#8e74ae')
    rr(d,(425,361,534,587),'#bba1d7',25)
    d.arc((293,589,667,764),0,180,fill='#c6b0dd',width=5)
    for left,right in LACING_PAIRS:
        for x,y in (left,right):circle(d,x,y,20,'#c3a9dd');circle(d,x,y,12,'#725b91')
    path1=[LACING_PAIRS[0][0],LACING_PAIRS[1][1],LACING_PAIRS[2][0],LACING_PAIRS[3][1],(685,310)]
    path2=[LACING_PAIRS[0][1],LACING_PAIRS[1][0],LACING_PAIRS[2][1],LACING_PAIRS[3][0],(281,310)]
    u=ease(t/1.5); left,right=LACING_PAIRS[0]; mid=((left[0]+right[0])/2,left[1])
    line(d,[pos(mid,left,u),pos(mid,right,u)],'#c5b18b',15)
    line(d,[pos(mid,left,u),pos(mid,right,u)],'#f5e5c7',9)
    for k,pts in enumerate((path1,path2)):
        progress=clamp((t-1.35-k*.28)/6.1)*4
        visible=[pts[0]]
        for i in range(4):
            if progress>=i+1:visible.append(pts[i+1])
            elif progress>i:visible.append(pos(pts[i],pts[i+1],ease(progress-i)));break
            else:break
        if len(visible)>1:
            line(d,visible,'#bda783',16);line(d,visible,'#f5e5c7',10)
            tip=visible[-1]; prev=visible[-2]
            dx,dy=tip[0]-prev[0],tip[1]-prev[1];norm=max(1,math.hypot(dx,dy))
            line(d,[(tip[0]-dx/norm*20,tip[1]-dy/norm*20),tip],'#e5d4b4',13)

SCENES={'M01':train,'M02':beads,'M03':funnel,'M04':dino,'M05':hair_cutting,'M06':donut,'M07':hair_beading,'M08':cash_register,'M10':shoe}

BACKGROUNDS={}
def frame(product_id,t):
    meta=DEMOS[product_id]
    if product_id not in BACKGROUNDS:
        im=Image.new('RGB',(W,W),PAPER);d=ImageDraw.Draw(im)
        d.ellipse((58,209,902,828),fill=SAGE)
        d.text((58,42),'TIGO LAB',font=font(24,True),fill=INK)
        rr(d,(645,37,902,78),'#eaf1e6',20)
        d.text((667,51),'ILUSTRASI CARA BERMAIN',font=font(16,True),fill='#567660')
        size=34 if len(meta['name'])<29 else 29
        d.text((58,111),meta['name'],font=font(size,True),fill=INK)
        d.text((59,163),meta['title'],font=font(23),fill='#6d7b6b')
        BACKGROUNDS[product_id]=im
    im=BACKGROUNDS[product_id].copy();d=ImageDraw.Draw(im)
    SCENES[product_id](d,t)
    # Separate the scene and the current instruction, including entry/exit travel.
    im.paste(BACKGROUNDS[product_id].crop((0,0,W,208)),(0,0))
    d=ImageDraw.Draw(im)
    step=0 if t<meta['breaks'][0] else 1 if t<meta['breaks'][1] else 2
    rr(d,(58,842,902,907),'#e8efe5',20)
    circle(d,90,874,17,'#4a8062')
    d.text((90,873),str(step+1),font=font(18,True),fill=PAPER,anchor='mm')
    d.text((120,874),meta['steps'][step],font=font(22,True),fill=INK,anchor='lm')
    d.text((60,930),'Ilustrasi gerak • model disederhanakan dari foto katalog',font=font(16),fill='#7a8478')
    for i in range(3):rr(d,(758+i*49,930,793+i*49,935),'#4e8362' if i<=step else '#d5dfce',3)
    return im

def get_ffmpeg():
    if os.environ.get('FFMPEG_BIN'):return os.environ['FFMPEG_BIN']
    if shutil.which('ffmpeg'):return shutil.which('ffmpeg')
    # Optional local helper used in the authoring workspace.
    helper=ROOT/'../../tmp/video-tools'
    if helper.exists():sys.path.insert(0,str(helper.resolve()))
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def render(product_id):
    meta=DEMOS[product_id];target=OUT/(meta['slug']+'-demo.mp4')
    ffmpeg=get_ffmpeg()
    cmd=[ffmpeg,'-hide_banner','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{W}','-r',str(FPS),'-i','pipe:0',
         '-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
    with (QA/(meta['slug']+'-encode.log')).open('w',encoding='utf-8') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for f in range(FPS*DURATION):proc.stdin.write(frame(product_id,f/FPS).tobytes())
        proc.stdin.close()
        if proc.wait():raise RuntimeError(meta['slug']+' encoding failed')
    frame(product_id,8.8).save(ASSETS/(meta['slug']+'-demo-poster.webp'),'WEBP',quality=87)
    check=subprocess.run([ffmpeg,'-hide_banner','-i',str(target),'-f','null','-'],capture_output=True,text=True)
    if check.returncode:raise RuntimeError(check.stderr)
    print(f'{product_id} {meta["slug"]}: {DURATION}s, {target.stat().st_size:,} bytes, decode OK',flush=True)

def manifest():
    records={}
    for key,meta in DEMOS.items():
        records[key]={k:meta[k] for k in ('title','description','steps')}
        records[key].update(video=f'assets/videos/{meta["slug"]}-demo.mp4',poster=f'assets/{meta["slug"]}-demo-poster.webp',note='Ilustrasi cara bermain. Model disederhanakan dari foto katalog.')
    records['M09']=dict(title='Putar, turun, susun.',description='Lihat bagaimana setiap bentuk berputar mengikuti ulir dan tersusun di tiang.',steps=['Posisikan bentuk di atas tiang.','Putar dan turunkan mengikuti ulir.','Susun bentuk satu per satu.'],video='assets/videos/stacker-demo.mp4',poster='assets/stacker-demo-poster.webp',note='Ilustrasi cara bermain dengan model 3D sederhana.')
    (ROOT/'dist/demos.js').write_text("'use strict';\nconst productDemos = "+json.dumps(records,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--all',action='store_true');parser.add_argument('--preview',action='store_true');parser.add_argument('--product',choices=DEMOS)
    args=parser.parse_args(); keys=[args.product] if args.product else list(DEMOS)
    if args.preview:
        for key in keys:
            for t in (1.5,4.8,8.8):frame(key,t).save(QA/f'{key}-{t}.jpg',quality=93)
        for t in (4.8,8.8):
            sheet=Image.new('RGB',(960,960),PAPER)
            for i,key in enumerate(keys):sheet.paste(frame(key,t).resize((320,320)),((i%3)*320,(i//3)*320))
            sheet.save(QA/f'contact-{t}.jpg',quality=94)
        print(f'Previews: {QA.resolve()}',flush=True)
    elif args.all or args.product:
        for key in keys:render(key)
        manifest()
    else:parser.print_help()
