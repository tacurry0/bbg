"""Build NIGHTBALL's portable meshes. blender -b -t 2 -P scripts/build-match-models.py"""
import math
from pathlib import Path

import bpy

OUTPUT = Path(__file__).resolve().parents[1] / "dist" / "assets" / "3d"
OUTPUT.mkdir(parents=True, exist_ok=True)


def material(name, color, metallic=0, roughness=.75):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


def mesh(name, verts, faces, mat, smooth=False):
    # Convert the engine's y-up coordinates to Blender's z-up coordinates.
    data = bpy.data.meshes.new(name)
    data.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    return obj


def box(name, center, size, mat, angle=0):
    x, y, z = center
    w, h, d = [v / 2 for v in size]
    cs, sn = math.cos(angle), math.sin(angle)
    verts = [(x + u * cs + v * sn, y + a, z - u * sn + v * cs)
             for u, a, v in [(-w,-h,-d),(w,-h,-d),(w,h,-d),(-w,h,-d),
                             (-w,-h,d),(w,-h,d),(w,h,d),(-w,h,d)]]
    mesh(name, verts, [(3,2,1,0),(4,5,6,7),(0,1,5,4),
                       (3,7,6,2),(0,4,7,3),(1,2,6,5)], mat)


def ribbon(name, start, end, section, mat, segments=32):
    verts = []
    faces = []
    width = len(section)
    for i in range(segments + 1):
        angle = start + (end - start) * i / segments
        verts += [(r * math.sin(angle), y, r * math.cos(angle)) for r,y in section]
        if i:
            for j in range(width-1):
                k = (i-1)*width+j
                faces.append((k,k+1,k+1+width,k+width))
    mesh(name, verts, faces, mat)


def torso():
    white = material("Uniform", (.78,.76,.64))
    seam = material("Piping", (.09,.13,.14))
    # Tapered athletic jersey with shoulders, waist, neck opening and fabric contour.
    profile = [(.43,.263,.217),(.49,.273,.231),(.58,.268,.224),(.71,.296,.244),
               (.84,.332,.242),(.905,.319,.221),(.956,.236,.179),(.998,.122,.119),
               (1.01,.105,.106),(.984,.09,.094)]
    segments = 24
    verts, faces = [], []
    for j,(y,w,d) in enumerate(profile):
        for i in range(segments):
            a = i * math.tau / segments
            x,z = math.sin(a)*w, math.cos(a)*d
            fold = (1 + .027*math.sin(a*7+j*.7))
            verts.append((x*fold,y,z*fold))
            if j:
                k=(j-1)*segments+i
                n=(j-1)*segments+(i+1)%segments
                faces.append((k,n,n+segments,k+segments))
    mesh("Jersey",verts,faces,white,True)
    trim = [(y,d*(1+.027*math.sin(j*.7))) for j,(y,w,d) in enumerate(profile[:-1])]
    for sign in [-1,1]:
        for j,((y,z),(ey,ez)) in enumerate(zip(trim, trim[1:])):
            x = sign * .012
            mesh("Placket", [(x-.003,y,z+.002),(x+.003,y,z+.002),
                             (x+.003,ey,ez+.002),(x-.003,ey,ez+.002)],
                 [(0,1,2,3)], seam)
    for y in [.56,.65,.74,.83]:
        box("Button", (0,y,.248), (.018,.018,.009), white)


def park(dome):
    concrete = material("Concrete", (.18,.23,.28) if dome else (.20,.28,.31))
    fascia = material("Fascia", (.035,.09,.15) if dome else (.032,.13,.17), .16)
    aisle = material("Aisle", (.38,.42,.46), .09)
    glass = material("Suite glazing", (.025,.09,.15), .46, .28)
    lamp = material("Suite lighting", (.30,.55,.72) if dome else (.8,.48,.18), .15)
    if dome:
        ribbon("Dome upper deck face",-1.44,1.44,[(165,18.7),(166,21.4),(173,21.4),(173,19)],fascia,64)
        ribbon("Dome suite windows",-1.44,1.44,[(165.85,19.15),(166,20.8)],glass,64)
        ribbon("Upper lip",-1.44,1.44,[(165.5,21.4),(165.5,21.72),(174,21.72)],aisle,64)
        ribbon("Ribbon board casing",-1.4,1.4,[(143.8,8.9),(144,10.75),(146,10.75)],fascia,56)
        ribbon("Ribbon board trim",-1.4,1.4,[(144,10.3),(144,10.52)],lamp,56)
        for i in range(-14,15):
            a=i*.095
            box("Glazing mullion",(165.7*math.sin(a),20,165.7*math.cos(a)),(.21,2.1,.21),aisle,a)
    else:
        for start,end in [(-1.12,-.21),(.20,1.12)]:
            ribbon("Concourse structure",start,end,[(145,8.7),(146,12.7),(154,12.7),(154,8.7)],fascia)
            ribbon("Press box glazing",start,end,[(145.45,10.25),(145.75,12.1)],glass)
            ribbon("Concourse fascia",start,end,[(144.8,8.7),(145,9.15)],lamp)
            for i in range(8):
                a=start+(end-start)*(i+.5)/8
                box("Concourse column",(145.5*math.sin(a),10.8,145.5*math.cos(a)),(.35,3.4,.42),concrete,a)
            for i in range(5):
                a=start+(end-start)*(i+.5)/5
                ribbon("Stair aisle",a-.012,a+.012,[(129,.62),(136,4.2),(143,7.8),(149,11)],aisle,2)


def export(name, build):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    # Merge by appearance to keep draw calls low on phones.
    by_material = {}
    for obj in list(bpy.context.scene.objects):
        by_material.setdefault(obj.data.materials[0].name, []).append(obj)
    for mat, objects in by_material.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = mat
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                              export_yup=True, export_texcoords=False, export_normals=True)


export("jersey", torso)
export("intercontinental", lambda: park(False))
export("tokyo-dome", lambda: park(True))
