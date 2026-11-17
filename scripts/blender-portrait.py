"""Prepare Mark's Tripo bust for independent head and eye tracking. Run with Blender --background --python."""
import bpy, bmesh, math, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'art/portrait'; OUT=ROOT/'public/portfolio/avatars'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ART/'mark-clay-source.glb'))
body=next(o for o in bpy.context.scene.objects if o.type=='MESH');body.name='ClayBust'
body.scale*=2;bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(body.data);bm.free()
# Subdivide once without smoothing away the original likeness. This also gives eye openings clean boundaries.
sub=body.modifiers.new('Eye socket precision','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
eyes=[('EyeLeft',-.184,1.275,-.55389),('EyeRight',.179,1.289,-.54955)]
bm=bmesh.new();bm.from_mesh(body.data)
remove=[]
for face in bm.faces:
 p=face.calc_center_median()
 for _,x,z,y in eyes:
  if p.y < -.43 and ((p.x-x)/(.070 if x<0 else .062))**2+((p.z-z)/.025)**2 < 1:
   remove.append(face);break
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(body.data);bm.free()
dec=body.modifiers.new('Web mesh budget','DECIMATE');dec.ratio=.60;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=dec.name)
# Keep the original authored texture while reducing the runtime map sizes.
for mat in body.data.materials:
 bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 bsdf.inputs['Specular IOR Level'].default_value=.2
 for name,value in [('Metallic',0),('Roughness',.82)]:
  for link in list(bsdf.inputs[name].links):mat.node_tree.links.remove(link)
  bsdf.inputs[name].default_value=value
 for n in mat.node_tree.nodes:
  if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.3
  if n.type=='TEX_IMAGE' and n.image:
   img=n.image
   if max(img.size)>1024:img.scale(1024,1024)
   img.pack()
# Neck skinning: shoulders are fixed; front beard stays rigidly attached to head.
arm=bpy.data.armatures.new('PortraitRig');rig=bpy.data.objects.new('PortraitRig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);body.select_set(False);bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones.new('Shoulders');root.head=(0,.1,0);root.tail=(0,.1,.3)
head=arm.edit_bones.new('Head');head.head=(0,-.02,.48);head.tail=(0,-.02,1.4);head.parent=root
bpy.ops.object.mode_set(mode='OBJECT')
group=body.vertex_groups.new(name='Head');fixed=body.vertex_groups.new(name='Shoulders')
for v in body.data.vertices:
 x,y,z=v.co
 t=max(0,min(1,(z-.36)/.46));w=t*t*(3-2*t)
 if y < -.32 and z > .3:w=1
 group.add([v.index],w,'REPLACE');fixed.add([v.index],1-w,'REPLACE')
mod=body.modifiers.new('Neck deformation','ARMATURE');mod.object=rig;body.parent=rig
for face in body.data.polygons:face.use_smooth=True

def material(name,colour,rough=.65):
 m=bpy.data.materials.new(name);m.diffuse_color=(*colour,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*colour,1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.25;return m
white=material('Warm clay sclera',(.65,.64,.58));iris=material('Blue grey iris',(.11,.18,.20));rim=material('Iris edge',(.035,.055,.06));pupil=material('Pupil',(.009,.014,.017));glint=material('Eye glint',(.8,.85,.86),.25)
# Parent controls to the head bone while preserving their world-space placement.
def attach(obj,parent):
 world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world

def cap(name,control,radius,eye_radius,mat,offset=0):
 verts=[(0,-eye_radius-offset,0)];faces=[];rings=4;segments=48
 for ring in range(1,rings+1):
  rr=radius*ring/rings
  for j in range(segments):
   a=2*math.pi*j/segments;verts.append((rr*math.cos(a),-math.sqrt(eye_radius*eye_radius-rr*rr)-offset,rr*math.sin(a)))
 for j in range(segments):faces.append((0,1+j,1+(j+1)%segments))
 for ring in range(rings-1):
  a=1+ring*segments;b=a+segments
  for j in range(segments):faces.append((a+j,b+j,b+(j+1)%segments,a+(j+1)%segments))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=control;o.data.materials.append(mat)
 for face in mesh.polygons:face.use_smooth=True
 return o
for name,x,z,y in eyes:
 radius=.083;centre=Vector((x,y+radius+.004,z))
 control=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(control);control.location=centre;bpy.context.view_layer.update();world=control.matrix_world.copy();control.parent=rig;control.parent_type='BONE';control.parent_bone='Head';control.matrix_world=world
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=radius,location=centre)
 sphere=bpy.context.object;sphere.name=name+'Sclera';sphere.data.materials.append(white);bpy.context.view_layer.update();attach(sphere,control)
 for p in sphere.data.polygons:p.use_smooth=True
 cap(name+'Rim',control,.036,radius,rim,.0005);cap(name+'Iris',control,.032,radius,iris,.001);cap(name+'Pupil',control,.016,radius,pupil,.0015)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.004,location=centre+Vector((-.009,-radius-.001,.012)));o=bpy.context.object;o.name=name+'Glint';o.data.materials.append(glint);bpy.context.view_layer.update();attach(o,control)
# Save and export the model only, excluding preview lights/camera.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'mark-clay.glb'),export_format='GLB',export_apply=False,export_animations=False,export_yup=True,export_image_format='JPEG',export_jpeg_quality=88)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Portrait studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.3,.3,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power,size in [((-3,-4,5),500,4),((3,-2,3),250,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-6,1));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.2;scene.camera=camera
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'mark-clay-rigged.blend'))
scene.render.filepath='/tmp/mark-clay-rigged-front.png';bpy.ops.render.render(write_still=True)
