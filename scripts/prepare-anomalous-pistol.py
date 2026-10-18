# Run: blender -b --factory-startup --python this_file.py -- source.gltf output.glb
import bpy, math, sys
from pathlib import Path
args=sys.argv[sys.argv.index("--")+1:]
source,destination=map(str,map(Path,args))
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
for o in list(bpy.context.scene.objects):
 print('SOURCE',o.name,tuple(o.dimensions),tuple(o.location))
 if not o.name.endswith('_a'): bpy.data.objects.remove(o,do_unlink=True)
# The source points along +X. Aim along -Y in Blender / -Z in glTF.
objects=list(bpy.context.scene.objects)
root=bpy.data.objects.new('Worn service pistol',None);bpy.context.collection.objects.link(root)
for o in objects:o.parent=root
root.rotation_euler.z=-math.pi/2
bpy.context.view_layer.update()
bounds=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in bounds) for i in range(3)));hi=Vector(tuple(max(v[i] for v in bounds) for i in range(3)))
print('BOUNDS',lo,hi)
root.scale*=.48/(hi.y-lo.y)
# Place barrel near y=0 (vertical in engine); grip below it.
root.location.z=-.06*root.scale.x
for image in bpy.data.images:
 if image.size[0]>1024 or image.size[1]>1024:image.scale(1024,1024)
bpy.ops.export_scene.gltf(filepath=destination,export_format='GLB',export_image_format='JPEG',export_jpeg_quality=80,export_materials='EXPORT',export_extras=False)
