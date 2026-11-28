"""Compose pre-rendered model frames with the existing NIGHTBALL menu art.
Requires Pillow and ffmpeg. The five H.264 clips and poster images are checked
in; player devices never execute this generator or Blender.
"""
from pathlib import Path
import math, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
ROOT=Path(__file__).resolve().parents[1]
ASSET=ROOT/'dist/assets/menu';OUT=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/nightball-home-v277')
DEST=ASSET/'motion-v277';DEST.mkdir(exist_ok=True)
ART=Image.open(ASSET/'home-card-art-v1.webp').convert('RGB')
HERO=Image.open(ASSET/'clubhouse-v18.webp').convert('RGB')
FPS=16
def extend_art(img,size,safe):
    # Preserve the original background in the text area. Extend the
    # stadium/sky only (never the baked-in static character) behind the
    # animated models, using a reflected crop with a subtle softened seam.
    w,h=size;original=img.resize((w,h),Image.Resampling.LANCZOS)
    n=int(w*safe);left=original.crop((0,0,n,h))
    bg=Image.new('RGB',size);bg.paste(left,(0,0))
    x=n;flip=True
    while x<w:
        part=ImageOps.mirror(left) if flip else left
        bg.paste(part.crop((0,0,min(n,w-x),h)),(x,0));x+=n;flip=not flip
    soft=bg.filter(ImageFilter.GaussianBlur(2.0));mask=Image.new('L',size)
    draw=ImageDraw.Draw(mask)
    for x in range(w):draw.line((x,0,x,h),fill=round(255*max(0,min(1,(x-n+15)/35))))
    return Image.composite(soft,bg,mask)
def gradient(size,colors):
    w,h=size;im=Image.new('RGB',size);d=ImageDraw.Draw(im)
    for y in range(h):
        t=y/(h-1);c=tuple(round(a+(b-a)*t) for a,b in zip(*colors));d.line((0,y,w,y),fill=c)
    return im
def font(size):
    p='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    return ImageFont.truetype(p,size)
def bg(name,w,h):
    if name.startswith('hero'):return extend_art(HERO,(w,h),.385)
    if name.startswith('match'):return extend_art(ART.crop((0,0,ART.width,ART.height//2)),(w,h),.47)
    if name=='career':return extend_art(ART.crop((0,ART.height//2,ART.width,ART.height)),(w,h),.63)
    if name=='online':
        im=gradient((w,h),((90,84,177),(23,60,135))).convert('RGBA')
        layer=Image.new('RGBA',(w,h));d=ImageDraw.Draw(layer)
        for x in range(0,w,43):
            d.polygon([(x,0),(x+11,0),(x-61,h),(x-72,h)],fill=(195,191,255,22))
        d.ellipse((w*.43,-h*.17,w*1.05,h*1.1),outline=(219,222,255,68),width=2)
        return Image.alpha_composite(im,layer).convert('RGB')
    im=gradient((w,h),((255,247,169),(229,180,51))).convert('RGBA')
    layer=Image.new('RGBA',(w,h));d=ImageDraw.Draw(layer)
    for x in range(30,w+40,55):d.polygon([(x,0),(x+10,0),(x-76,h),(x-86,h)],fill=(255,255,227,48))
    return Image.alpha_composite(im,layer).convert('RGB')
def shadow(im,coords):
    layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
    for x,y,rx,ry in coords:d.ellipse((x-rx,y-ry,x+rx,y+ry),fill=(4,20,30,85))
    return Image.alpha_composite(im,layer.filter(ImageFilter.GaussianBlur(4)))
def compose(name,frames):
    first=Image.open(frames[0]);w,h=first.size;background=bg(name,w,h).convert('RGBA');rng=random.Random(277)
    pieces=[(rng.uniform(.49,.98),rng.random(),rng.uniform(.7,1.5),rng.uniform(0,6.28),rng.choice([(255,255,230),(244,76,72),(42,115,218),(255,229,60),(42,166,112)])) for _ in range(34)]
    result=[]
    for i,frame in enumerate(frames):
        t=i/FPS;phase=i/len(frames);im=background.copy()
        if name.startswith('hero'):
            im=shadow(im,[(w*.58,h*.90,29,5),(w*.80,h*.91,35,6)])
            # Tiny pennants in the existing stands move independently of the
            # actual pitch / catch action, never in front of the title.
            d=ImageDraw.Draw(im,'RGBA')
            for j in range(17):
                x=w*.48+j*w*.029;y=h*.63+3*math.sin(t*5+j*1.3)
                d.line((x,y+5,x+1,y-1),fill=(219,232,238,130),width=1)
                d.polygon([(x,y-3),(x+4,y-1+math.sin(t*9+j)),(x,y+2)],fill=(112+int(j%3)*40,181,226,140))
        elif name.startswith('match'): im=shadow(im,[(w*.74,h*.92,23,5)])
        elif name=='career':im=shadow(im,[(w*(.54+.21*min(1,phase/.6)),h*.93,22,5)])
        elif name=='online':im=shadow(im,[(w*.60,h*.90,23,5),(w*.83,h*.90,23,5)])
        elif name=='season':im=shadow(im,[(w*.74,h*.90,29,6)])
        im.alpha_composite(Image.open(frame).convert('RGBA'))
        if name=='season':
            d=ImageDraw.Draw(im,'RGBA')
            for x,p,s,a,color in pieces:
                yy=((p+phase*s)%1.0)*h;xx=(x+.023*math.sin(t*4+a))*w
                if yy<h*.86:
                    L=3+2*math.sin(t*7+a);d.line((xx,yy,xx+L,yy+3),fill=(*color,205),width=2)
        if name=='online' and t>.65:
            d=ImageDraw.Draw(im,'RGBA');alpha=int(255*min(1,(t-.65)/.15));f=font(int(25+4*math.sin(min(1,(t-.65)/.34)*math.pi)))
            d.text((w*.74,h*.16),'VS',font=f,anchor='mm',fill=(255,255,245,alpha),stroke_width=2,stroke_fill=(31,39,90,alpha))
        # Darkness in the exact existing text area keeps labels legible.
        shade=Image.new('RGBA',im.size);d=ImageDraw.Draw(shade)
        for x in range(int(w*.70)):
            alpha=int((58 if name!='season' else 0)*max(0,1-x/(w*.60)))
            d.line((x,0,x,h),fill=(3,22,55,alpha))
        im=Image.alpha_composite(im,shade)
        result.append(im.convert('RGB'))
    return result
def joined(a,b,fade=5):
    if not b:return a
    # Short cross-dissolves instead of flashes between the actual actions.
    result=a[:]
    result += [Image.blend(a[-1],b[0],(i+1)/(fade+1)) for i in range(fade)]
    result += b
    result += [Image.blend(b[-1],a[0],(i+1)/(fade+1)) for i in range(fade)]
    return result
for name,next_name in [('hero','hero-field'),('match','match-pitch'),('season',None),('online',None),('career',None)]:
    folders=[name]+([next_name] if next_name else [])
    sequences=[compose(n,sorted((OUT/n).glob('*.png'))) for n in folders]
    if len(sequences)>1: frames=joined(sequences[0],sequences[1])
    else:
        frames=sequences[0]+[Image.blend(sequences[0][-1],sequences[0][0],(i+1)/6) for i in range(5)] if name in ('career','online') else sequences[0]
    w,h=frames[0].size
    # Save representative mid-action posters for release-banner rotation.
    frames[len(sequences[0])//3].save(DEST/(name+'.webp'),'WEBP',quality=85,method=6)
    cmd=['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','slow','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','-profile:v','main','-level','3.0',str(DEST/(name+'.mp4'))]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    for frame in frames:p.stdin.write(frame.tobytes())
    p.stdin.close()
    if p.wait():raise RuntimeError(name+' encode failed')
    print(name,len(frames),'frames',round(len(frames)/FPS,2),'seconds',(DEST/(name+'.mp4')).stat().st_size,'bytes')

    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(DEST/(name+'.mp4')),'-vf','fps=12','-c:v','libwebp_anim','-lossless','0','-compression_level','4','-q:v','62','-loop','0',str(DEST/(name+'-animated.webp'))],check=True)
