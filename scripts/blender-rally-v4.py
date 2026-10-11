"""Editable, low-poly production miniature kit. +Y Blender maps to -Z glTF; forward is -Y."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
random.seed(74)
base=Path(__file__).resolve().parents[1];out=base/'public/rally/v4';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.72;return m
def rgb(h):
 values=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values)
def box(name,p,s,m,parent=None,r=.07):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if r:
  mod=o.modifiers.new('Hand rounded edges','BEVEL');mod.width=r;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 o.parent=parent;return o
def sphere(name,p,s,m,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,location=p);o=bpy.context.object;o.name=name;o.scale=s;o.data.materials.append(m);o.parent=parent
 for f in o.data.polygons:f.use_smooth=True
 return o
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=parent;return o
def mesh(name,v,f,m,parent):
 d=bpy.data.meshes.new(name);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.data.materials.append(m);o.parent=parent
 for p in d.polygons:p.use_smooth=True
 return o
def export(name,root):
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in root.children_recursive:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/name),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
def batch(root):
 groups={}
 for o in list(root.children):
  if o.type=='MESH' and not o.name.startswith(('headlamp','taillamp','reverse_lamp')):groups.setdefault(o.data.materials[0].name,[]).append(o)
 for objects in groups.values():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
colors=['2459bc','f0eadd','ece8db','e4d9bc','f1eddb','d84232','eee8d8','284e9a','414648'];accents=['f4d24b','2472ae','cc4030','a72d32','2467ab','272f31','e14c36','d7b357','eceee9']
rubber=mat('Matte rubber',rgb('252a28'));glass=mat('Smoked glazing',rgb('263d47'));red=mat('Red lenses',rgb('b92e24'));white=mat('Cream lenses',rgb('fff0c6'));black=mat('Grilles',rgb('202b2b'))
for i in range(9):
 root=empty('vehicle_'+str(i));paint=mat('Clay body '+str(i),rgb(colors[i]));accent=mat('Livery '+str(i),rgb(accents[i]));rim=mat('Wheel alloy '+str(i),rgb('d5af4c' if i in [0,7] else 'b7b9b0'))
 L=3.65 if i in [3,5,6,7] else 4.5 if i==4 else 4.1
 if i<8:
  # Continuous ring loft defines bonnet, raked glass, roof and rear deck.
  hatch=i in [3,5,6,7];coupe=i==2
  rings=[(-L/2,.85,.95),(-L*.43,1.07,1.17),(-L*.23,1.04,1.27),(-L*.08,.89,1.84 if not coupe else 1.63),(L*.23,.86,1.86 if not coupe else 1.64),(L*.37,1.0,1.45 if hatch else 1.23),(L/2,.93,1.05)]
  v=[]
  for y,w,h in rings:
   for x,z in [(-w,.62),(-w,1.0),(-w*.83,h-.04),(-w*.60,h),(w*.60,h),(w*.83,h-.04),(w,1.0),(w,.62)]:v.append((x,y,z))
  f=[tuple(range(7,-1,-1)),tuple(range((len(rings)-1)*8,len(rings)*8))]
  for j in range(len(rings)-1):
   for k in range(8):f.append((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k))
  body=mesh('body_surface',v,f,paint,root);mod=body.modifiers.new('Soft silhouette','BEVEL');mod.width=.06;mod.segments=2;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
  roofh=1.84 if not coupe else 1.63
  mesh('windscreen',[(-.80,-L*.225,1.29),(.80,-L*.225,1.29),(.70,-L*.075,roofh+.006),(-.70,-L*.075,roofh+.006)],[(0,1,2,3)],glass,root)
  for side in [-1,1]:
   for a,b in [(-.055,.07),(.09,.225)]:mesh('side_window',[(side*.94,L*a,1.31),(side*.94,L*b,1.31),(side*.72,L*b,roofh+.007),(side*.72,L*a,roofh+.007)],[(0,1,2,3)] if side==1 else [(3,2,1,0)],glass,root)
   box('rally_stripe',(side*1.07,.02,1.03),(.025,L*.67,.12),accent,root,.015)
   box('mirror',(side*1.12,-.36,1.43),(.27,.25,.17),paint,root,.06)
   box('door_number',(side*1.087,.12,1.13),(.024,.4,.26),white,root,.015)
  box('bumper',(0,-L/2,.82),(1.9,.20,.35),paint,root,.09);box('intake',(0,-L/2-.11,.84),(.91,.025,.18),black,root,.035)
  if i in [0,1,2,3]:box('bonnet_scoop',(0,-.90,1.29),(.72,.46,.12),paint,root,.05)
  wingz=1.97 if i==1 else 1.58 if i in [0,4] else 1.48
  box('rally_spoiler',(0,L*.44,wingz),(2.04,.34,.13),paint,root,.05)
  for x in [-.68,.68]:box('wing_support',(x,L*.43,(wingz+1.13)/2),(.09,.15,wingz-1.13),paint,root,.025)
 else:
  L=3.3;box('kart_chassis',(0,0,.49),(2.05,3.0,.22),paint,root,.14);box('kart_nose',(0,-1.15,.66),(1.7,.65,.32),accent,root,.14)
  for x in [-.85,.85]:box('sidepod',(x,0,.65),(.42,1.65,.4),paint,root,.15)
  sphere('driver_body',(0,.30,1.01),(.36,.34,.49),paint,root);sphere('helmet',(0,.36,1.63),(.44,.42,.43),accent,root);box('visor',(0,-.03,1.65),(.6,.10,.18),black,root,.06)
  box('engine',(.65,.95,.81),(.56,.58,.48),black,root,.08)
  for x in [-.26,.26]:sphere('driver_arm',(x,-.18,1.07),(.11,.36,.12),paint,root)
 for x in [-.7,.7]:
  box('headlamp_'+str(x),(x,-L/2-.025,.99 if i<8 else .69),(.5,.07,.20),white,root,.035)
  box('taillamp_'+str(x),(x,L/2+.025,.99 if i<8 else .69),(.44,.07,.18),red,root,.035)
  box('reverse_lamp_'+str(x),(x*.65,L/2+.03,.99 if i<8 else .69),(.12,.08,.12),white,root,.025)
 for side,x in [('left',-1.08),('right',1.08)]:
  for axle,y in [('front',-1.3),('rear',1.3)]:
   pivot=empty('wheel_'+axle+'_'+side,root);pivot.location=(x,y,.52);spin=empty('wheel_spin',pivot)
   bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.52,depth=.48,location=(0,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='flat_tyre';o.data.materials.append(rubber);o.parent=spin;mod=o.modifiers.new('Tyre shoulders','BEVEL');mod.width=.045;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
   for f in o.data.polygons:f.use_smooth=True
   for face in [-1,1]:
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=4,major_radius=.32,minor_radius=.035,location=(face*.247,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='rim';o.data.materials.append(rim);o.parent=spin
    for spoke in range(8):
     a=spoke*math.pi/4;o=box('spoke',(face*.25,math.sin(a)*.16,math.cos(a)*.16),(.025,.04,.31),rim,spin,.008);o.rotation_euler[0]=-a
   batch(spin)
 anchor=empty('cockpit_anchor',root);anchor.location=(0,.05,1.75 if i<8 else 1.5)
 batch(root);export('car-'+str(i)+'.glb',root)
 # Keep editable assets arranged on a source sheet, after export.
 root.location.x=i*6
# Keep the approved Impreza body and livery, normalised to the existing racing footprint.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.import_scene.gltf(filepath=str(base/'public/rally/trial/v2/car.glb'))
imported=list(bpy.context.selected_objects);approved=empty('approved_impreza')
for obj in imported:
 if obj.parent is None:obj.parent=approved
approved.rotation_euler.z=math.pi;approved.scale=(.90,.90,.95)
for obj in approved.children_recursive:
 if obj.type=='MESH' and len(obj.data.polygons)>300:
  bpy.context.view_layer.objects.active=obj;mod=obj.modifiers.new('Production silhouette budget','DECIMATE');mod.ratio=.5;bpy.ops.object.modifier_apply(modifier=mod.name)
export('car-0.glb',approved)
approved.location=(0,7,0)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/rally/production-v4.blend'))
print('V4 assets',sum(p.stat().st_size for p in out.glob('*.glb')))
