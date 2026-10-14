import bpy, math, os
from mathutils import Vector
ROOT='/Users/markwhitley/Documents/Codex Projects/markwhitleydesign'
previous=bpy.context.window.scene
scene=bpy.data.scenes.new('Aster Hover GT V5.2');bpy.context.window.scene=scene
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
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos(p));o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(mats[mat]);o.parent=parent
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
 bpy.ops.export_scene.gltf(filepath=ROOT+'/public/rally/v52/'+name,export_format='GLB',use_selection=True,use_active_scene=True)
 return {'name':name,'bytes':os.path.getsize(ROOT+'/public/rally/v52/'+name)}
os.makedirs(ROOT+'/public/rally/v52',exist_ok=True)
hover=empty('aster_hover_gt',(0,0,0));empty('cockpit_anchor',(0,1.65,.1),hover)
# Narrow sculpted fuselage leaves room for four outboard ducts within the original footprint.
sphere('sculpted_hull',(0,.72,0),(.66,.29,2.08),'hover_paint',hover)
sphere('lower_keel',(0,.57,.25),(.50,.17,1.88),'hover_paint',hover)
sphere('canopy_rim',(0,.99,-.13),(.55,.31,1.17),'hover_paint',hover)
sphere('cockpit_glazing',(0,1.02,-.13),(.53,.32,1.14),'glass',hover)
sphere('roof_spine',(0,1.28,-.40),(.11,.09,.70),'hover_paint',hover)
for side in [-1,1]:
 sphere('shoulder_sweep',(side*.52,.76,-.12),(.10,.10,1.53),'metal',hover)
 for z,label in [(1.30,'front'),(-1.30,'rear')]:
  arm=sphere('sculpted_arm',(side*.65,.61,z*.83),(.42,.10,.20),'hover_paint',hover)
  arm.rotation_euler.z=side*(.3 if z>0 else -.3)
  pod=empty('hover_pod_'+label+('_left' if side<0 else '_right'),(side*.80,.64,z),hover)
  pod.rotation_euler.y=math.radians(side*12)
  # Hollow stepped annulus, not a solid wheel: a visible open fan well.
  profile=[(.30,-.13),(.35,-.16),(.39,-.06),(.40,.045),(.37,.13),(.30,.14),(.28,.06),(.28,-.10)]
  verts=[];faces=[]
  for radius,y in profile:
   for i in range(32):
    a=2*math.pi*i/32;verts.append(pos((radius*math.cos(a),y,radius*math.sin(a))))
  for j in range(len(profile)):
   for i in range(32):faces.append((j*32+i,j*32+(i+1)%32,((j+1)%len(profile))*32+(i+1)%32,((j+1)%len(profile))*32+i))
  mesh=bpy.data.meshes.new('duct_profile');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('satin_duct',mesh);scene.collection.objects.link(o);o.parent=pod;o.data.materials.append(mats['hover_paint'])
  for f in mesh.polygons:f.use_smooth=True
  bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=.305,minor_radius=.025,location=(0,0,0));rim=bpy.context.object;rim.name='duct_lip';rim.parent=pod;rim.location=pos((0,.11,0));rim.data.materials.append(mats['metal'])
  for f in rim.data.polygons:f.use_smooth=True
  sphere('fan_hub',(0,-.015,0),(.085,.105,.085),'metal',pod)
  for i in range(7):
   a=i*2*math.pi/7;blade=cube('fan_blade',(.08,.025,.23),(.14*math.sin(a),-.025,.14*math.cos(a)),'rubber',pod,.015);blade.rotation_euler.z=-a;blade.rotation_euler.y=.20
  sphere('underpod',(0,-.15,0),(.24,.085,.24),'rubber',pod)
  # Batch each articulated pod independently to keep draw calls bounded.
  for mat in ['hover_paint','metal','rubber']:
   objects=[o for o in pod.children if o.type=='MESH' and o.data.materials[0]==mats[mat]]
   if len(objects)>1:
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
sphere('nose_bumper',(0,.72,1.84),(.55,.10,.22),'hover_paint',hover)
sphere('tail_bumper',(0,.72,-1.84),(.57,.10,.22),'hover_paint',hover)
cube('headlamp_front_bar',(1.02,.07,.06),(0,.76,1.99),'glow',hover,.025)
cube('taillamp_rear_bar',(1.08,.07,.06),(0,.76,-1.99),'tail',hover,.025)
# glTF-supported satin response; shallow geometry carries the handmade softness.
for name,rough,metallic in [('hover_paint',.48,.15),('metal',.42,.45),('glass',.24,.25)]:
 p=mats[name].node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metallic
summary=[export(hover,'car-9.glb')]
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/rally/aster-hover-v52.blend',copy=True)
bpy.context.window.scene=previous
result={'assets':summary}
