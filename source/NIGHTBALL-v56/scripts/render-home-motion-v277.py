"""Offline render of NIGHTBALL's original Three.js geometry and pose rig.
Run with Blender: blender -b -t 8 -P scripts/render-home-motion-v277.py -- /tmp/nightball-home-v277 [shot] [frame].
"""
import bpy, json, sys, math, pathlib, os, time
from mathutils import Matrix, Vector
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]); only=args[1] if len(args)>1 else None; frame_no=int(args[2]) if len(args)>2 else None
data=json.loads((out/'scene.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine=os.environ.get('NIGHTBALL_RENDER_ENGINE','BLENDER_WORKBENCH')
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
if scene.render.engine=='BLENDER_WORKBENCH':
    scene.view_settings.view_transform='Standard'
    sh=scene.display.shading;sh.light='STUDIO';sh.studio_light='paint.sl';sh.studiolight_rotate_z=.4;sh.color_type='MATERIAL';sh.show_shadows=False;sh.show_cavity=False;sh.show_specular_highlight=True;sh.show_object_outline=False
    scene.display.render_aa='8'
else:
    scene.eevee.taa_render_samples=8
    scene.world.color=(.24,.24,.24)
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def coord(a): return Vector((a[0],-a[2],a[1]))
def point_at(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,pos,energy,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;point_at(o,(0,0,1.35))
area('Softbox left',(-3,-4,6),1000,(1,.89,.76),5)
area('Soft fill',(4,-3,3.9),700,(.68,.84,1),4)
area('Stadium rim',(2,3,6),1250,(.66,.83,1),3)
camdata=bpy.data.cameras.new('Menu camera');camdata.type='ORTHO'
cam=bpy.data.objects.new('Menu camera',camdata);scene.collection.objects.link(cam);scene.camera=cam
materials=[]
for info in data['materials']:
    m=bpy.data.materials.new('NB menu material');r,g,b=info['color'];m.diffuse_color=(r,g,b,1)
    m.use_nodes=True;node=m.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(r,g,b,1);node.inputs['Metallic'].default_value=info['metalness'];node.inputs['Roughness'].default_value=info['roughness'];materials.append(m)
geo=[]
for n,g in enumerate(data['geometries']):
    v=g['v'];i=g['index'];mesh=bpy.data.meshes.new('NB geometry '+str(n));mesh.from_pydata(list(zip(v[::3],v[1::3],v[2::3])),[],list(zip(i[::3],i[1::3],i[2::3])));mesh.update()
    for p in mesh.polygons:p.use_smooth=len(mesh.polygons)>16
    if g.get('n'):mesh.normals_split_custom_set_from_vertices(list(zip(g['n'][::3],g['n'][1::3],g['n'][2::3])))
    mesh.materials.append(materials[0]);geo.append(mesh)
for shot in data['shots']:
    name=shot['name']
    if only and only!=name: continue
    folder=out/name;folder.mkdir(exist_ok=True)
    objects={}
    for id in shot['meshes']:
        sid=str(id);m=data['meshes'][sid];ob=bpy.data.objects.new('NB '+sid,geo[m['g']]);scene.collection.objects.link(ob);ob.material_slots[0].link='OBJECT';ob.material_slots[0].material=materials[m['m']];objects[sid]=ob
    camera=shot['camera'];cam.location=coord(camera['eye']);point_at(cam,coord(camera['target']));camdata.ortho_scale=camera['width']
    scene.render.resolution_x=shot['w'];scene.render.resolution_y=shot['h'];scene.render.fps=shot['fps']
    frames=range(len(shot['frames'])) if frame_no is None else [frame_no]
    for f in frames:
        frame=shot['frames'][f]
        for id,v in frame.items():
            ob=objects[id];ob.hide_render=not v['vis'];a=v['matrix'];mat=Matrix([[a[c*4+r] for c in range(4)] for r in range(4)]);ob.matrix_world=C@mat
            if 'v' in v:ob.data.vertices.foreach_set('co',v['v']);ob.data.update()
        scene.render.filepath=str(folder/f'{f:04}.png')
        bpy.ops.render.render(write_still=True)
        if f%8==0: print('SHOT',name,f,flush=True)
    for ob in objects.values():bpy.data.objects.remove(ob,do_unlink=True)
