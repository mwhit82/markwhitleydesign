import bpy, math, random, json, os
from mathutils import Vector
from pathlib import Path
random.seed(92)
base=Path(__file__).resolve().parents[1];out=base/'public/rally/trial/v2';out.mkdir(parents=True,exist_ok=True)
t=json.loads((out/'terrain.json').read_text());original=bpy.context.scene
scene=bpy.data.scenes.new('Clay study V2');bpy.context.window.scene=scene
scene.world=bpy.data.worlds.new('Study atmosphere');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.56,.65,.72,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
car=bpy.data.objects.new('trial_car',None);scene.collection.objects.link(car)
def mat(name,c,rough=.75,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
def mesh(name,vertices,faces,m,parent=None):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.data.materials.append(m)
 if parent:o.parent=parent
 return o
def smooth(o):
 for p in o.data.polygons:p.use_smooth=True
 return o
def bevel(o,width=.04,segments=3):
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Soft clay edge','BEVEL');mod.width=width;mod.segments=segments;bpy.ops.object.modifier_apply(modifier=mod.name);smooth(o);return o
def box(name,loc,size,m,parent=None,b=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if parent:o.parent=parent
 if b:bevel(o,b)
 return o
def ellipsoid(name,loc,scale,m,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 if parent:o.parent=parent
 return smooth(o)
blue=mat('Rally blue clay',(.008,.028,.34),.48);rubber=mat('Soft rubber',(.025,.029,.034),.92);glass=mat('Smoked glazing',(.008,.018,.028),.46,0);cream=mat('Ivory clay',(.88,.86,.73));red=mat('Tail lens',(.55,.018,.012),.22);silver=mat('Satin alloy',(.42,.47,.49),.38,.65);green=mat('Sage foliage',(.16,.29,.095));bark=mat('Clay bark',(.16,.105,.065));ochre=mat('Clay ochre',(.68,.43,.1));mud=mat('Dried mud deposits',(.20,.12,.06),.98)
glass.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.15
gold=mat('Rally gold',(.95,.62,.035),.42,.28)
# A single continuous section-loft shell: boot, cabin and bonnet share topology.
sections=[(-2.28,.94,1.0,.83),(-2.2,1.05,1.07,.92),(-1.75,1.09,1.20,.94),(-1.4,1.08,1.23,.92),(-1.03,1.055,1.57,.75),(-.8,1.04,1.68,.76),(-.6,1.04,1.7,.77),(.23,1.04,1.7,.77),(.40,1.055,1.62,.78),(.94,1.10,1.27,.96),(1.35,1.12,1.26,1.0),(1.86,1.10,1.17,.98),(2.18,1.06,1.04,.98),(2.28,.99,.98,.94)]
verts=[]
for y,w,roof,rw in sections:
 for x,z in [(-w*.94,.38),(-w,.63),(-w,1.00),(-rw,roof-.09),(-rw*.82,roof), (0,roof+.025),(rw*.82,roof),(rw,roof-.09),(w,1.00),(w,.63),(w*.94,.38),(0,.36)]:verts.append((x,y,z))
n=12;faces=[]
for i in range(len(sections)-1):
 for j in range(n):faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
faces+=[tuple(reversed(range(n))),tuple((len(sections)-1)*n+j for j in range(n))]
body=mesh('sculpted_body',verts,faces,blue,car);bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Sculpted continuity','SUBSURF');mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
# Open arches are cut into the continuous body, rather than wheels stuck on its sides.
for y in [-1.325,1.325]:
 for side in [-1,1]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.605,depth=.72,location=(side*1.13,y,.55),rotation=(0,math.pi/2,0));cutter=bpy.context.object;bpy.context.view_layer.objects.active=body
  mod=body.modifiers.new('Wheel arch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;mod.solver='EXACT';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
bevel(body,.018,2)
# Sloping inset glass, body-coloured pillars and cohesive saloon proportions.
def pane(name,corners,side=0):
 vertices=[];faces=[];steps=8
 for j in range(steps+1):
  for i in range(steps+1):
   u=i/steps;v=j/steps;a=Vector(corners[0]).lerp(Vector(corners[1]),u);b=Vector(corners[3]).lerp(Vector(corners[2]),u);q=a.lerp(b,v)
   origin=Vector((side*3,q.y,q.z)) if side else Vector((q.x,q.y,4));direction=Vector((-side,0,0)) if side else Vector((0,0,-1));hit,pos,norm,_=body.ray_cast(origin,direction)
   if hit:q=pos+norm*.012
   vertices.append(tuple(q))
 for j in range(steps):
  for i in range(steps):
   k=j*(steps+1)+i;faces.append((k,k+1,k+steps+2,k+steps+1))
 o=mesh(name,vertices,faces,glass,car);o.data.materials[0].use_nodes=True
 smooth(o)
pane('front_glass',[(-.66,.39,1.60),(.66,.39,1.60),(.85,.92,1.17),(-.85,.92,1.17)])
pane('rear_glass',[(-.65,-.94,1.59),(.65,-.94,1.59),(.83,-1.37,1.17),(-.83,-1.37,1.17)])
for side in [-1,1]:
 pane('rear_side_glass',[(side*.9,-1.27,1.08),(side*.9,-.38,1.08),(side*.77,-.38,1.56),(side*.77,-.99,1.52)],side)
 pane('front_side_glass',[(side*.9,-.29,1.08),(side*.9,.8,1.08),(side*.77,.32,1.56),(side*.77,-.29,1.56)],side)
 box('mirror',(side*1.15,.68,1.20),(.25,.28,.17),blue,car,.06)
 box('door_handle',(side*1.08,-.40,.98),(.035,.18,.04),silver,car,.01)
 box('sill',(side*1.04,0,.43),(.12,1.7,.12),blue,car,.035)
 for axle,y in [('front',1.325),('rear',-1.325)]:
  name='wheel_'+axle+('_left' if side<0 else '_right');wheel=bpy.data.objects.new(name,None);scene.collection.objects.link(wheel);wheel.parent=car;wheel.location=(side*1.03,y,.55)
  bpy.ops.mesh.primitive_torus_add(major_radius=.415,minor_radius=.135,major_segments=32,minor_segments=10,location=(0,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=name+'_tyre';o.data.materials.append(rubber);o.parent=wheel;o.location=(0,0,0);o.scale.x=1.15;smooth(o)
  bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.34,depth=.14,location=(0,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=name+'_hub';o.data.materials.append(rubber);o.parent=wheel;o.location=(side*.08,0,0);bevel(o,.015,2)
  for k in range(8):
   a=k*math.pi/4;spoke=box(name+'_spoke',(0,0,0),(.035,.048,.69),gold,None,.015);spoke.parent=wheel;spoke.location=(side*.16,0,0);spoke.rotation_euler.x=a
  bpy.ops.mesh.primitive_torus_add(major_radius=.355,minor_radius=.035,major_segments=32,minor_segments=8,rotation=(0,math.pi/2,0));rim=bpy.context.object;rim.name=name+'_gold_rim';rim.parent=wheel;rim.location=(side*.16,0,0);rim.data.materials.append(gold);smooth(rim)
  mount=bpy.data.objects.new('suspension_'+name,None);scene.collection.objects.link(mount);mount.parent=car;mount.location=wheel.location
for side in [-1,1]:
 box('headlamp_'+str(side),(side*.70,2.235,.91),(.57,.065,.19),cream,car,.035)
 box('taillamp_'+str(side),(side*.73,-2.235,.89),(.4,.065,.2),red,car,.03)
 box('reverse_lamp_'+str(side),(side*.42,-2.24,.87),(.16,.065,.13),cream,car,.025)
 box('spoiler_mount',(side*.77,-1.91,1.25),(.085,.22,.34),blue,car,.025)
box('rally_spoiler',(0,-1.94,1.48),(2.14,.43,.11),blue,car,.045)
box('upper_grille',(0,2.282,.9),(.72,.04,.18),rubber,car,.025)
box('lower_intake',(0,2.255,.55),(1.18,.05,.22),rubber,car,.035)
box('front_lip',(0,2.14,.37),(1.88,.24,.06),blue,car,.025)
for side in [-1,1]:
 ellipsoid('fog_recess',(side*.82,2.20,.57),(.20,.055,.18),rubber,car)
 ellipsoid('fog_lens',(side*.82,2.25,.57),(.12,.022,.12),cream,car)
box('bonnet_scoop',(0,1.32,1.31),(.64,.45,.11),blue,car,.03)
box('scoop_inlet',(0,1.54,1.32),(.50,.025,.055),rubber,car,.008)
# Gold rally graphics are projected onto the sculpted clay rather than floating panels.
def decal(name,coords,material,side=0):
 vertices=[]
 for q in coords:
  q=Vector(q);origin=Vector((side*3,q.y,q.z)) if side else Vector((q.x,q.y,4));direction=Vector((-side,0,0)) if side else Vector((0,0,-1));hit,pos,norm,_=body.ray_cast(origin,direction)
  vertices.append(tuple(pos+norm*.018 if hit else q))
 o=mesh(name,vertices,[tuple(range(len(vertices)))],material,car)
 # Decals remain visible from either side of the projected polygon.
 return o
def star(cx,cy,s):
 return [(cx+math.cos(i*math.pi/4)*s*(1 if i%2==0 else .24),cy+math.sin(i*math.pi/4)*s*(1 if i%2==0 else .24)) for i in range(8)]
for side in [-1,1]:
 for cy,cz,sz in [(-.53,.83,.29),(-.04,.89,.13),(.23,.78,.10),(-.01,.63,.10),(-.36,.56,.10),(-.76,.54,.10)]:
  decal('gold_star',[(side*1.1,y,z) for y,z in star(cy,cz,sz)],gold,side)
 # Broad crescent sweep behind the star motif.
 coords=[]
 for i in range(17):
  a=-1.2+i*2.4/16;coords.append((side*1.1,-.55-math.cos(a)*.72,.77+math.sin(a)*.29))
 for i in range(16,-1,-1):
  a=-1.2+i*2.4/16;coords.append((side*1.1,-.47-math.cos(a)*.63,.77+math.sin(a)*.22))
 decal('gold_sweep',coords,gold,side)
 # Conventional Blender text, converted to mesh; no downloaded branding artwork.
 bpy.ops.object.text_add(location=(side*1.109,-.13,.61));o=bpy.context.object;o.name='SUBARU_wordmark';o.data.body='SUBARU';o.data.size=.15;o.data.extrude=.001;o.data.align_x='CENTER';o.rotation_euler=(math.pi/2,0,side*math.pi/2);o.data.materials.append(gold);o.parent=car;bpy.ops.object.convert(target='MESH')
# Bonnet stars and a small grille badge.
for x,y,sz in [(-.22,1.8,.19),(.13,1.83,.08),(.34,1.75,.07),(.12,1.65,.07)]:decal('bonnet_star',[(xx,yy,1.13) for xx,yy in star(x,y,sz)],gold)
box('grille_badge',(0,2.309,.91),(.19,.013,.075),gold,car,.024)
# Terrain height is the identical function used beneath the four wheels in Three.js.
def height(x,z):
 h=.025*math.sin(x*.8+z*.35)+.018*math.cos(z*1.4)+.012*math.sin(x*3+z*2)-.038*math.exp(-((abs(x)-t['trackWidth']/2)/.22)**2)
 for b in t['bumps']:h+=b['height']*math.exp(-((z-b['z'])/b['width'])**2)*math.exp(-(x/3.8)**4)
 for p in t['puddles']:
  r=math.hypot((x-p['x'])/p['rx'],(z-p['z'])/p['rz'])
  if r<1.22:
   k=min(1,max(0,(1.22-r)/.25));k=k*k*(3-2*k);basin=p['level']-p['depth']*max(0,1-r*r);h=h*(1-k)+basin*k
 return h
soil=mat('terrain_soil',(.36,.27,.17),.9)
# Baked colour, roughness and normal maps: world-aligned gravel/ruts, not flat clay.
size=512;color=[];rough=[];normal=[]
for j in range(size):
 z=(j/(size-1)-.5)*28
 for i in range(size):
  x=(i/(size-1)-.5)*20;n=random.random();edge=3.3+.22*math.sin(z*1.6)+.16*math.sin(z*3.1);road=max(0,min(1,(edge-abs(x))/.45+.5));rut=math.exp(-((abs(x)-.97)/.24)**2)
  gravel=(1 if n>.95 else 0);earthc=[.36,.28,.19];grassc=[.23,.29,.14];c=[(grassc[k]*(1-road)+earthc[k]*road)*( .8+n*.28-rut*.12)+gravel*.08 for k in range(3)];color.extend(c+[1]);r=.72+n*.25-rut*.09;rough.extend([r,r,r,1]);normal.extend([.5+(random.random()-.5)*.22,.5+(random.random()-.5)*.22,.97,1])
for name,pixels,socket,noncolor in [('Ground colour',color,'Base Color',False),('Ground roughness',rough,'Roughness',True),('Ground normal',normal,'Normal',True)]:
 image=bpy.data.images.new(name,width=size,height=size)
 if noncolor:image.colorspace_settings.name='Non-Color'
 image.pixels=pixels
 image.pack();node=soil.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
 if socket=='Normal':
  bump=soil.node_tree.nodes.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.45;soil.node_tree.links.new(node.outputs['Color'],bump.inputs['Color']);soil.node_tree.links.new(bump.outputs['Normal'],soil.node_tree.nodes['Principled BSDF'].inputs['Normal'])
 else:soil.node_tree.links.new(node.outputs['Color'],soil.node_tree.nodes['Principled BSDF'].inputs[socket])
nx=100;nz=140;v=[(-10+i*20/nx,14-j*28/nz,height(-10+i*20/nx,-14+j*28/nz)) for j in range(nz+1) for i in range(nx+1)];f=[]
for j in range(nz):
 for i in range(nx):a=j*(nx+1)+i;f.append((a,a+nx+1,a+nx+2,a+1))
ground=mesh('terrain',v,f,soil);smooth(ground);uv=ground.data.uv_layers.new()
for poly in ground.data.polygons:
 for idx in poly.loop_indices:
  co=ground.data.vertices[ground.data.loops[idx].vertex_index].co;uv.data[idx].uv=((co.x+10)/20,(-co.y+14)/28)
# Clay vegetation outside the test lane.
for i in range(18):
 x=random.choice([-1,1])*random.uniform(4.6,8.8);z=random.uniform(-12,12)
 box('tree_trunk',(x,-z,.7+height(x,z)),(.24,.26,1.4),bark,b=.06)
 ellipsoid('clay_tree',(x,-z,2.1+height(x,z)),(random.uniform(.7,1.15),.8,1.45),green)
for i in range(40):
 x=random.choice([-1,1])*random.uniform(3.8,9);z=random.uniform(-13,13);ellipsoid('clay_shrub',(x,-z,.3+height(x,z)),(.45,.5,.45),green)
for i in range(110):
 x=random.choice([-1,1])*random.uniform(2.9,4.2);z=random.uniform(-13,13);ellipsoid('gravel',(x,-z,height(x,z)+.015),(.045,.065,.026),mud)
for x,z in [(-4.8,4.5),(4.9,-4.2)]:
 box('flag_pole',(x,-z,1.6),(.06,.06,3.2),cream,b=.015)
 for k,m in enumerate([blue,cream,ochre]):box('clay_flag',(x+.4+k*.3,-z,2.65),(.3,.035,.65),m,b=.01)
# Batch fixed body surfaces and each wheel separately, preserving lights and animation roots.
for parent in [car]+[o for o in car.children if o.name.startswith('wheel_')]:
 grouped={}
 for o in list(parent.children):
  if o.type=='MESH' and not o.name.startswith(('headlamp','taillamp','reverse_lamp')):grouped.setdefault(o.data.materials[0].name,[]).append(o)
 for material,objects in grouped.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=parent.name+'_'+material
# Batch environment only. Named car parts remain independently animateable.
environment=[o for o in scene.objects if o.type=='MESH' and not o.parent]
groups={}
for o in environment:groups.setdefault(o.data.materials[0].name,[]).append(o)
for objects in groups.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
def export(path,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
carobjects=[car]+list(car.children_recursive)
export(out/'car.glb',carobjects);export(out/'environment.glb',[o for o in scene.objects if o.type=='MESH' and not o.parent])
# Render uses the same depression water level, exported water is made dynamically in the browser.
water=mat('Preview water',(.1,.16,.17),.12,.3)
for p in t['puddles']:ellipsoid('preview_water',(p['x'],-p['z'],p['level']), (p['rx'],p['rz'],.002),water)
bpy.ops.object.light_add(type='AREA',location=(-6,2,12));bpy.context.object.data.energy=1800;bpy.context.object.data.size=10
bpy.ops.object.camera_add(location=(10,13,9));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=15;scene.camera=camera
bpy.data.libraries.write(str(base/'art/rally/clay-study-v2.blend'),{scene});scene.render.filepath='/tmp/clay-study-v2.png';bpy.ops.render.render(write_still=True);bpy.context.window.scene=original
print('TRIAL V2',json.dumps({p.name:p.stat().st_size for p in out.glob('*.glb')}))
