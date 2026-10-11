import bpy, math, random, os
from mathutils import Vector
random.seed(31)
original=bpy.context.scene
scene=bpy.data.scenes.new('Pocket Rally V3.1 • Clay study')
bpy.context.window.scene=scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Clay study world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.65,.7,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
root=bpy.data.objects.new('RALLY CAR • clay study',None);scene.collection.objects.link(root)
def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal

 if rough>.6:
  image=bpy.data.images.new(name+' clay grain',width=64,height=64);pixels=[]
  for i in range(64*64):
   noise=random.uniform(.91,1.04);pixels.extend([min(1,c*noise) for c in color]+[1])
  image.pixels=pixels;image.pack();node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
 return m
blue=material('Hand moulded petrol blue',(.035,.18,.25));cream=material('Warm clay ivory',(.82,.77,.62));black=material('Rubber charcoal',(.025,.032,.035),.96);glass=material('Smoky glass',(.055,.11,.14),.2);red=material('Brake lens',(.65,.055,.025),.28);earth=material('Damp terracotta',(.24,.13,.065),.92);grass=material('Sage clay',(.25,.32,.13));leaf=material('Dark leaves',(.085,.18,.105));water=material('Puddle reflection',(.16,.24,.25),.13);silver=material('Wheel centres',(.4,.43,.42),.45,.3)
def box(name,loc,size,mat,bevel=.08,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft pressed edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Weighted clay normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 if parent:o.parent=parent
 return o
def sphere(name,loc,scale,mat,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 if parent:o.parent=parent
 return o
box('Rounded body',(0,0,.85),(2.12,4.15,.72),blue,.16,root)
box('Cabin',(0,-.22,1.45),(1.72,1.9,.82),blue,.22,root)
box('Windscreen',(0,.755,1.53),(1.48,.12,.54),glass,.08,root)
box('Rear glass',(0,-1.195,1.49),(1.42,.08,.46),glass,.08,root)
for x in [-.865,.865]:
 box('Side windows',(x*1.03,-.2,1.57),(.045,1.5,.42),glass,.05,root)
 box('Door strip',(x*1.2,0,.91),(.05,2.5,.2),cream,.025,root)
 box('Mirror',(x*1.25,.57,1.39),(.28,.34,.2),blue,.07,root)
 for y in [-1.34,1.34]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.51,depth=.37,location=(x*1.26,y,.52),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Rounded tyre';o.data.materials.append(black);o.parent=root
  bevel=o.modifiers.new('Rounded rubber','BEVEL');bevel.width=.06;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.29,depth=.39,location=(x*1.26,y,.52),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Alloy hub';o.data.materials.append(silver);o.parent=root
for x in [-.72,.72]:
 box('Front lamp',(x,2.09,.97),(.43,.06,.24),cream,.035,root)
 box('Rear lens',(x,-2.09,.98),(.42,.06,.21),red,.03,root)
 box('Spoiler bracket',(x,-1.64,1.32),(.12,.2,.43),black,.025,root)
box('Rear wing',(0,-1.7,1.57),(2.22,.43,.12),blue,.04,root)
box('Bonnet stripe',(0,1.42,1.222),(.48,1.2,.02),cream,.006,root)
box('Grille',(0,2.095,.73),(1.25,.045,.23),black,.025,root)
for i in range(36):
 side=1 if i%2 else -1
 sphere('Hand pressed mud fleck',(side*1.065,random.uniform(-1.8,1.8),random.uniform(.63,.94)),(.018,random.uniform(.045,.12),random.uniform(.035,.07)),earth,root)
for i in range(12):sphere('Bonnet mud fleck',(random.uniform(-.9,.9),random.uniform(1.1,1.9),1.23),(.06,.09,.009),earth,root)
box('Roadside diorama',(0,0,-.24),(18,23,.45),grass,.5)
box('Muddy road',(0,0,.015),(7.2,23,.09),earth,.15)
for i in range(85):
 x=random.choice([-1,1])*random.uniform(3.4,4.4);y=random.uniform(-10.5,10.5)
 sphere('Broken clay shoulder',(x,y,.03),(random.uniform(.12,.55),random.uniform(.25,.8),.08),earth)
for y in [-6.5,5.5]:sphere('Shallow puddle',(0,y,.075),(2.8,1.5,.012),water)
for i in range(30):
 x=random.choice([-1,1])*random.uniform(4.5,8);y=random.uniform(-10,10)
 sphere('Rounded shrub',(x,y,.45),(random.uniform(.3,.75),.55,.65),leaf)
for i in range(45):
 x=random.choice([-1,1])*random.uniform(4,8);y=random.uniform(-10,10)
 bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.12,radius2=.015,depth=.55,location=(x,y,.28));o=bpy.context.object;o.name='Clay grass';o.data.materials.append(grass)
for i,(x,y) in enumerate([(-5,3),(5,-3),(-5,-6),(5,7)]):
 box('Flag pole',(x,y,1.6),(.07,.07,3.2),cream,.02)
 colors=[cream,blue,red] if i%2 else [blue,cream,blue]
 for k,m in enumerate(colors):box('International flag stripe',(x+.6+(k-1)*.38,y,2.65),(.38,.035,.72),m,.018)
bpy.ops.object.light_add(type='AREA',location=(-5,-3,12));light=bpy.context.object;light.name='Softbox';light.data.energy=1800;light.data.shape='DISK';light.data.size=9
bpy.ops.object.camera_add(location=(12,15,13));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=21;scene.camera=camera
base='/Users/markwhitley/Documents/Codex Projects/markwhitleydesign'
out=base+'/public/rally/trial'
os.makedirs(out,exist_ok=True)
# Batch static parts by material while retaining separate wheel meshes for later animation.
groups={}
for o in list(scene.objects):
 if o.type=='MESH' and not o.name.startswith(('Rounded tyre','Alloy hub')):
  key=(o.parent is root,o.data.materials[0].name);groups.setdefault(key,[]).append(o)
for objects in groups.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join()
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
 if o.type=='MESH':o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out+'/clay-roadside.glb',export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
bpy.ops.object.select_all(action='DESELECT')
for o in root.children:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out+'/clay-car.glb',export_format='GLB',use_selection=True,export_cameras=False,export_lights=False)
bpy.data.libraries.write('/tmp/pocket-rally-clay-study.blend',{scene})
scene.render.filepath='/tmp/pocket-rally-clay-study.png'
bpy.ops.render.render(write_still=True)
bpy.context.window.scene=original
result={'scene':scene.name,'glb_bytes':os.path.getsize(out+'/clay-roadside.glb'),'car_bytes':os.path.getsize(out+'/clay-car.glb'),'objects':len(scene.objects),'source':'/tmp/pocket-rally-clay-study.blend'}
