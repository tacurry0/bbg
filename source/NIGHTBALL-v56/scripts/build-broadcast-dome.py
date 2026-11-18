"""Build the prototype stadium shell with Blender. blender -b -t 2 -P scripts/build-broadcast-dome.py"""
from pathlib import Path
import math
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
out = Path(__file__).resolve().parents[1] / "dist" / "assets" / "3d" / "broadcast-dome.glb"


def material(name, rgb, roughness=.8):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def bowl_vertex(radius, angle, height):
    return (radius * math.sin(angle), height, 43 + radius * .79 * math.cos(angle))


def add_mesh(name, verts, faces, mat):
    geometry = bpy.data.meshes.new(name)
    geometry.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
    geometry.update()
    obj = bpy.data.objects.new(name, geometry)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def ribbon(profile, mat, start=-math.pi, end=math.pi, segments=100):
    count = len(profile)
    verts = [bowl_vertex(r, start + (end - start) * i / segments, y)
             for i in range(segments + 1) for r, y in profile]
    faces = [(i * count + j, i * count + j + 1,
              (i + 1) * count + j + 1, (i + 1) * count + j)
             for i in range(segments) for j in range(count - 1)]
    add_mesh(mat.name, verts, faces, mat)


concrete = material("Terrace concrete", (.12, .16, .20))
balcony = material("Balcony edge", (.34, .41, .45))
shadow = material("Concourse shade", (.016, .030, .057))
seats = [material("Lower deep green", (.028, .126, .107)),
         material("Middle indigo", (.028, .071, .135)),
         material("Upper slate blue", (.060, .119, .170))]
rail = material("Brushed guardrails", (.38, .46, .51), .42)
ribbon([(141, 0), (141, 1.6), (148, 1.6)], shadow)
for tier, (start, floor, rows, run, rise) in enumerate(
        [(147, 1.8, 12, 1.21, .49), (151, 12.6, 9, 1.37, .62), (154, 23.2, 7, 1.85, .85)]):
    end = start + rows * run
    top = floor + rows * rise
    ribbon([(start - 2.4, floor - 2), (start - 2.4, floor + .55),
            (start, floor + .55), (start, floor)], balcony)
    ribbon([(start - 2.5, floor - 2.7), (start - 2.5, floor - 2.0),
            (end, floor - 1.1)], shadow)
    profile = [(start, floor)]
    for row in range(rows):
        r, y = start + row * run, floor + row * rise
        profile.extend([(r + run, y), (r + run, y + rise)])
        ribbon([(r + run * .40, y + .10), (r + run * .77, y + .10),
                (r + run * .91, y + .31)], seats[tier])
    ribbon(profile, concrete)
    ribbon([(end, top), (end + 3.5, top), (end + 3.5, top + .65)], balcony)
    ribbon([(start - 2.06, floor + .78), (start - 2.06, floor + .84)], rail)
    for aisle in range(28):
        center = (aisle + .5) * math.tau / 28
        ribbon([(r, y + .035) for r, y in profile], balcony, center - .013, center + .013, 1)

for mat in list(bpy.data.materials):
    objects = [obj for obj in bpy.context.scene.objects if obj.data.materials[0] == mat]
    if not objects:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    objects[0].name = mat.name

bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", export_yup=True,
                          export_texcoords=False, export_normals=True)
