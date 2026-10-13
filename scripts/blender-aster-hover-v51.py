import bpy, math, os
from mathutils import Vector
ROOT='/Users/markwhitley/Documents/Codex Projects/markwhitleydesign'
previous=bpy.context.window.scene
scene=bpy.data.scenes.new('Aster Hover GT V5.1');bpy.context.window.scene=scene
mats={}
for name,color in [('clay_charcoal',(.035,.05,.045,1)),('clay_trim',(.12,.16,.14,1)),('clay_cream',(.65,.62,.52,1)),('clay_suit',(.055,.065,.08,1)),('clay_blue',(.06,.12,.42,1)),('instrument_face',(.009,.015,.013,1)),('instrument_light',(.68,.78,.49,1)),('limiter',(.18,.025,.01,1))]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.83;mats[name]=m
 if name=='instrument_light':p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=.3

def pos(p):return (p[0],-p[2],p[1])
def empty(name,p,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=pos(p);o.parent=parent;return o

def cube(name,size,p,mat,parent=None,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Soft handmade edge','BEVEL');b.width=bevel;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
 for face in o.data.polygons:face.use_smooth=True
 o.data.materials.append(mats[mat]);o.parent=parent;return o

def beam(name,a,b,width,mat,parent=None):
 a=Vector(pos(a));b=Vector(pos(b));o=cube(name,(width,(b-a).length,width),(0,0,0),mat,parent,width*.2);o.location=(a+b)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o

def disc(name,r,p,mat,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=.008,location=pos(p),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(mats[mat]);o.parent=parent;return o


for name,color in [('hover_paint',(.012,.016,.021,1)),('mx_paint',(.7,.36,.05,1)),('rubber',(.018,.023,.02,1)),('metal',(.35,.39,.39,1)),('glass',(.03,.08,.12,1)),('glow',(.12,.8,.8,1)),('tail',(.7,.04,.015,1))]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=color;p.inputs['Roughness'].default_value=.7;mats[name]=m
 if name in ['glow','tail']:p.inputs['Emission Color'].default_value=color;p.inputs['Emission Strength'].default_value=1.2

def sphere(name,p,scale,mat,parent):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=pos(p));o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(mats[mat]);o.parent=parent
 for f in o.data.polygons:f.use_smooth=True
 return o

def export(root,name):
 # Batch fixed body surfaces by material, retain articulated pivots and lenses.
 groups={}
 for o in list(root.children):
  if o.type=='MESH' and not o.name.startswith(('headlamp','taillamp','reverse_lamp','rider')):groups.setdefault(o.data.materials[0].name,[]).append(o)
 for objects in groups.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=ROOT+'/public/rally/v51/'+name,export_format='GLB',use_selection=True,use_active_scene=True)
 return {'name':name,'bytes':os.path.getsize(ROOT+'/public/rally/v51/'+name)}
os.makedirs(ROOT+'/public/rally/v5',exist_ok=True)
hover=empty('aster_hover_gt',(0,0,0));empty('cockpit_anchor',(0,1.65,.1),hover)
# Low flowing body with tucked-in, flattened hover fairings.
sphere('sculpted_hull',(0,.70,0),(1.12,.34,2.12),'hover_paint',hover)
cube('integrated_nose',(1.86,.30,.95),(0,.68,1.63),'hover_paint',hover,.14)
cube('integrated_tail',(1.90,.28,.89),(0,.69,-1.68),'hover_paint',hover,.13)
sphere('cockpit_glazing',(0,1.05,-.18),(.74,.37,1.04),'glass',hover)
for side in [-1,1]:
 sphere('flowing_sill',(side*.98,.60,0),(.16,.16,1.55),'hover_paint',hover)
 for z in [-1.25,1.18]:
  sphere('slim_hover_fairing',(side*1.01,.45,z),(.20,.14,.48),'hover_paint',hover)
  cube('thruster_glow',(.20,.035,.43),(side*1.01,.32,z),'glow',hover,.015)
cube('headlamp_front_bar',(1.76,.095,.07),(0,.75,2.16),'glow',hover,.035)
cube('taillamp_rear_bar',(1.82,.09,.07),(0,.75,-2.16),'tail',hover,.03)
cube('integrated_rear_lip',(1.85,.085,.25),(0,.88,-1.65),'hover_paint',hover,.04)
summary=[export(hover,'car-9.glb')]
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/rally/aster-hover-v51.blend',copy=True)
bpy.context.window.scene=previous
result={'assets':summary}
