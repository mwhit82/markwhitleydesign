import bpy, math, os
from mathutils import Vector
ROOT='/Users/markwhitley/Documents/Codex Projects/markwhitleydesign'
previous=bpy.context.window.scene
scene=bpy.data.scenes.new('Pocket Rally Special Assets V5');bpy.context.window.scene=scene
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


for name,color in [('hover_paint',(.22,.12,.47,1)),('mx_paint',(.7,.36,.05,1)),('rubber',(.018,.023,.02,1)),('metal',(.35,.39,.39,1)),('glass',(.03,.08,.12,1)),('glow',(.12,.8,.8,1)),('tail',(.7,.04,.015,1))]:
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
 bpy.ops.export_scene.gltf(filepath=ROOT+'/public/rally/v5/'+name,export_format='GLB',use_selection=True,use_active_scene=True)
 return {'name':name,'bytes':os.path.getsize(ROOT+'/public/rally/v5/'+name)}
os.makedirs(ROOT+'/public/rally/v5',exist_ok=True)
hover=empty('aster_hover_gt',(0,0,0));empty('cockpit_anchor',(0,1.65,.1),hover)
sphere('sculpted_hull',(0,.72,0),(1.15,.42,2.15),'hover_paint',hover)
sphere('cockpit_glazing',(0,1.14,-.15),(.78,.48,1.05),'glass',hover)
cube('bonnet_spine',(.2,.15,1.3),(0,1.02,1.15),'clay_cream',hover,.06)
for side in [-1,1]:
 cube('side_sill',(.28,.28,3.0),(side*1.08,.63,0),'hover_paint',hover,.10)
 for z in [-1.35,1.25]:
  sphere('thruster_pod',(side*1.08,.45,z),(.38,.32,.62),'metal',hover)
  cube('thruster_glow',(.44,.08,.65),(side*1.08,.18,z),'glow',hover,.03)
 cube('headlamp_front',(.55,.12,.09),(side*.64,.83,1.95),'glow',hover,.04)
 cube('taillamp_rear',(.52,.12,.08),(side*.66,.8,-1.97),'tail',hover,.03)
 cube('fin',(.12,.5,.95),(side*.9,1.0,-1.35),'hover_paint',hover,.05)
cube('rear_wing',(2.2,.12,.38),(0,1.3,-1.55),'hover_paint',hover,.04)
summary=[export(hover,'car-9.glb')]
bike=empty('mudworks_250',(0,0,0));empty('cockpit_anchor',(0,1.95,.1),bike)
cube('engine',(.48,.5,.65),(0,.86,0),'metal',bike,.09)
beam('frame',(0,.65,-.8),(0,1.35,.6),.13,'clay_charcoal',bike)
cube('tank',(.52,.43,.7),(0,1.36,.2),'mx_paint',bike,.14)
cube('seat',(.44,.16,.85),(0,1.52,-.48),'rubber',bike,.06)
cube('front_fender',(.46,.10,.86),(0,1.17,1.08),'mx_paint',bike,.04)
cube('rear_fender',(.48,.12,.55),(0,1.45,-1.07),'mx_paint',bike,.05)
cube('headlamp_front',(.28,.2,.1),(0,1.53,.75),'clay_cream',bike,.04)
cube('taillamp_rear',(.2,.09,.08),(0,1.43,-1.29),'tail',bike,.02)
for front,z in [(True,1.05),(False,-1.05)]:
 pivot=empty('wheel_'+('front' if front else 'rear')+'_left',(0,.53,z),bike)
 bpy.ops.mesh.primitive_torus_add(major_radius=.39,minor_radius=.13,major_segments=20,minor_segments=8,rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='tyre';o.parent=pivot;o.data.materials.append(mats['rubber'])
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.31,depth=.12,rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='rim';o.parent=pivot;o.data.materials.append(mats['metal'])
 for side in [-1,1]:beam('fork' if front else 'swingarm',(side*.18,.53,z),(side*.18,1.42 if front else .85,.52 if front else -.2),.08,'metal',bike)
bar=empty('handlebar',(0,1.7,.58),bike);beam('bar',(-.55,0,0),(.55,0,0),.07,'metal',bar)
rider=empty('rider',(0,0,0),bike)
sphere('rider_torso',(0,1.85,-.28),(.29,.46,.22),'clay_suit',rider)
sphere('helmet',(0,2.38,-.03),(.29,.30,.31),'mx_paint',rider)
cube('visor',(.45,.12,.12),(0,2.40,.25),'glass',rider,.04)
for side in [-1,1]:
 beam('arm',(side*.22,2.04,-.2),(side*.47,1.72,.57),.16,'clay_suit',rider)
 sphere('glove',(side*.47,1.72,.57),(.1,.1,.12),'clay_cream',rider)
 beam('thigh',(side*.19,1.65,-.4),(side*.36,1.17,-.12),.22,'clay_suit',rider)
 beam('boot',(side*.36,1.17,-.12),(side*.28,.7,-.4),.2,'clay_charcoal',rider)
summary.append(export(bike,'car-10.glb'))
for kind in ['neon','mx']:
 kit=empty(kind+'_service_props',(0,0,0));paint='hover_paint' if kind=='neon' else 'mx_paint'
 cube('service_cabinet',(1.5,2.8,1.2),(0,1.4,0),paint,kit,.12)
 cube('service_screen',(1.05,.65,.08),(0,1.9,.64),'glow' if kind=='neon' else 'clay_charcoal',kit,.03)
 cube('tool_bench',(2,.15,.8),(2,1,.1),'metal',kit,.04)
 for x in [1.3,2.7]:cube('bench_leg',(.12,1,.6),(x,.5,.1),'clay_charcoal',kit,.02)
 for x in [-1.5,-2.2]:cube('power_cell' if kind=='neon' else 'fuel_can',(.5,.85,.55),(x,.425,0),paint,kit,.08)
 if kind=='mx':
  for z in [-.4,.35]:
   bpy.ops.mesh.primitive_torus_add(major_radius=.4,minor_radius=.14,major_segments=16,minor_segments=6,location=pos((3.5,.15,z)));o=bpy.context.object;o.name='spare_tyre';o.data.materials.append(mats['rubber']);o.parent=kit
 summary.append(export(kit,kind+'-props.glb'))
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/art/rally/special-vehicles-v5.blend',copy=True)
bpy.context.window.scene=previous
result={'assets':summary}
