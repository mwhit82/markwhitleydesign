"""Build the reference-fitted study. Run in Blender background mode, optionally passing the base .blend after --."""
import math
import sys
import tempfile
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art/portrait'
WEB = ROOT / 'public/portfolio/avatars'
base = Path(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else ART / 'mark-clay-rigged.blend'
bpy.ops.wm.open_mainfile(filepath=str(base))
scene = bpy.context.scene
body = bpy.data.objects['ClayBust']
rig = bpy.data.objects['PortraitRig']
reference = bpy.data.images.load(str(WEB / 'mark-clay.webp'))
reference.pack()
old_material = body.data.materials[0]
side_texture = old_material.node_tree.nodes['Image Texture'].image
units = 2.2 / 480

# Landmarks measured in the same 480px orthographic view of both portraits.
# A thin plate spline registers the sculpt to the painting with a smooth depth falloff.
pairs = [
    ((219,25),(219,13)), ((258,24),(260,12)), ((150,86),(139,82)),
    ((312,83),(320,82)), ((170,100),(163,96)), ((291,99),(296,95)),
    ((129,186),(119,183)), ((124,212),(119,210)), ((344,180),(354,178)),
    ((343,210),(355,211)), ((200,180),(199,182)), ((279,177),(284,178)),
    ((240,218),(241,225)), ((217,218),(216,227)), ((261,218),(263,225)),
    ((207,258),(204,267)), ((241,258),(241,269)), ((275,256),(279,265)),
    ((145,271),(140,274)), ((333,269),(342,270)), ((155,315),(151,318)),
    ((320,315),(328,319)), ((241,379),(243,388)), ((238,400),(240,412)),
    ((155,338),(149,344)), ((326,338),(329,342)), ((27,446),(-4,465)),
    ((450,446),(485,465)), ((240,458),(241,487)),
]
landmarks = np.array([a for a,b in pairs]) / 480
offsets = (np.array([b for a,b in pairs]) / 480) - landmarks

def kernel(r2):
    return r2 * np.log(np.maximum(r2, 1e-12))

K = kernel(np.sum((landmarks[:,None]-landmarks[None,:])**2, axis=2))
P = np.column_stack((np.ones(len(landmarks)), landmarks))
coeff = np.linalg.solve(np.block([[K+np.eye(len(K))*0.0001, P], [P.T,np.zeros((3,3))]]),
                        np.vstack((offsets,np.zeros((3,2)))))

def pixel(v):
    return np.array([240 + v.x / units, 240 - (v.z-1) / units])

coords = np.array([pixel(v.co) for v in body.data.vertices]) / 480
basis = np.column_stack((kernel(np.sum((coords[:,None]-landmarks[None,:])**2,axis=2)),np.ones(len(coords)),coords))
for v,d in zip(body.data.vertices,basis @ coeff):
    weight = np.clip((0.85-v.co.y)/0.8,0,1)
    v.co.x += d[0]*2.2*weight
    v.co.z -= d[1]*2.2*weight

def smooth(t):
    t = max(0, min(1,t))
    return t*t*(3-2*t)

def material(name,image,uv_name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    tree.nodes.clear()
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    uv = tree.nodes.new('ShaderNodeUVMap')
    uv.uv_map = uv_name
    output = tree.nodes.new('ShaderNodeOutputMaterial')
    emission = tree.nodes.new('ShaderNodeEmission')
    tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
    tree.links.new(tex.outputs['Color'],emission.inputs['Color'])
    tree.links.new(emission.outputs[0],output.inputs['Surface'])
    return mat

bm = bmesh.new()
bm.from_mesh(body.data)
deform = bm.verts.layers.deform.verify()
head_group = body.vertex_groups['Head'].index
image_pixels = np.empty(640*640*4,dtype=np.float32)
reference.pixels.foreach_get(image_pixels)
artwork = image_pixels.reshape(640,640,4)[::-1]

# Use one physical eyeball per eye. The coloured iris and its little highlights
# come from the reference. Only portions hidden under the original lids need filling.
def paint_eyeball(name, cx, cy, r_px, corners, half_width, top, bottom, iris_r):
    w,h = 512,256
    u,v = np.meshgrid((np.arange(w)+.5)/w,(np.arange(h)+.5)/h)
    lon,lat = (u-.5)*2*np.pi,(v-.5)*np.pi
    dx,dy = r_px*np.cos(lat)*np.sin(lon), -r_px*np.sin(lat)
    x,y = cx+dx,cy+dy
    radius = np.hypot(dx,dy)
    def sample(x,y):
        return artwork[np.clip(np.rint(y).astype(int),0,639),np.clip(np.rint(x).astype(int),0,639)]
    arch = np.maximum(0,1-((x-corners[0])/half_width)**2)
    rim = np.minimum(y-(corners[1]-top*arch), corners[1]+bottom*arch-y)
    # Extend the original sclera's natural warm tone over the hidden hemisphere.
    flank = cx + np.where(dx>0,1,-1)*(iris_r+3)
    sclera = sample(flank,cy + np.clip(dy*.4,-3,3))
    cap = sample(cx + np.sign(dx)*np.minimum(radius,iris_r-.3),cy)
    visibility = np.clip((rim-.5)/2,0,1)[...,None]
    pigment = visibility*sample(x,y)+(1-visibility)*cap
    coverage = np.clip(iris_r+.3-radius,0,1)[...,None] * (np.cos(lon)>0)[...,None]
    color = sclera*(1-coverage)+pigment*coverage
    img = bpy.data.images.new(name+' painted iris',w,h,alpha=False)
    img.pixels.foreach_set(np.ascontiguousarray(color,dtype=np.float32).ravel())
    img.pack()
    return img

for name,cx,cy,corners,half_width,top,bottom in [
    ('EyeLeft',265.5,242.6,(267,246),24,13,8),
    ('EyeRight',379,237.3,(377.5,242),25,13.8,7.1)]:
    control = bpy.data.objects[name]
    for obj in list(control.children):
        bpy.data.objects.remove(obj,do_unlink=True)
    candidates = [v for v in bm.verts if v.is_boundary and v.co.y<-.43 and
                  np.linalg.norm(pixel(v.co)-np.array([cx,cy])*.75)<28]
    rim = sorted(candidates,key=lambda v: math.atan2((pixel(v.co)[1]/.75-cy)/11,(pixel(v.co)[0]/.75-cx)/24))
    assert len(rim)>=14
    R = 30.5
    centre = Vector(((cx*.75-240)*units,-.41,1+(240-cy*.75)*units))
    inner = []
    for v in rim:
        px,py = pixel(v.co)/.75
        angle = math.atan2((py-cy)/11,(px-cx)/24)
        a = math.cos(angle)
        ex = corners[0]+half_width*a
        ey = corners[1]+(bottom if math.sin(angle)>0 else -top)*(1-a*a)
        dx,dy = ex-cx,ey-cy
        depth = centre.y - math.sqrt(max(.1,R*R-dx*dx-dy*dy))*.75*units
        # Pull the cut boundary slightly outward, leaving space for the shaped lid.
        v.co.x = centre.x+dx*1.16*.75*units
        v.co.z = centre.z-dy*1.23*.75*units
        v.co.y = min(v.co.y,depth-.003)
        n=bm.verts.new((centre.x+dx*.75*units,depth-.001,centre.z-dy*.75*units))
        n[deform][head_group]=1
        inner.append(n)
    for i,v in enumerate(rim):
        j=(i+1)%len(rim)
        f=bm.faces.new((v,inner[i],inner[j],rim[j]))
        # The lid gets its own UV island below; reserve an unused atlas gutter later.
        f.material_index=1
    world=control.matrix_world.copy()
    world.translation=centre
    control.matrix_world=world
    bpy.context.view_layer.update()
    rings,segments=24,40
    verts=[]; faces=[]
    for j in range(rings+1):
        lat=(j/rings-.5)*math.pi
        for i in range(segments+1):
            lon=(i/segments-.5)*2*math.pi
            verts.append(tuple(R*.75*units*n for n in (math.cos(lat)*math.sin(lon),-math.cos(lat)*math.cos(lon),math.sin(lat))))
    for j in range(rings):
        for i in range(segments):
            k=j*(segments+1)+i
            faces.append((k,k+1,k+segments+2,k+segments+1))
    mesh=bpy.data.meshes.new(name+' sphere')
    mesh.from_pydata(verts,[],faces); mesh.update()
    eye=bpy.data.objects.new(name+' painted globe',mesh)
    bpy.context.collection.objects.link(eye)
    eye.parent=control
    # Parent matrix is oriented with the Head bone. Preserve world-facing orientation.
    eye.matrix_world=Matrix.Translation(centre)
    eye_uv=mesh.uv_layers.new(name='EyeUV')
    for loop in mesh.loops:
        row,col=divmod(loop.vertex_index,segments+1)
        eye_uv.data[loop.index].uv=(col/segments,row/rings)
    for face in mesh.polygons: face.use_smooth=True
    mesh.materials.append(material(name+' artwork',paint_eyeball(name,cx,cy,R,corners,half_width,top,bottom,11.7),'EyeUV'))

# Give the new lid collar its own projection material; the rest bakes onto the
# original non-overlapping UV atlas. Both have the same reference camera.
body.data.materials.append(old_material)
bm.to_mesh(body.data);bm.free()
mesh=body.data
mesh.update()
projected=mesh.uv_layers.new(name='Portrait camera')
for loop in mesh.loops:
    x,y=pixel(mesh.vertices[loop.vertex_index].co)
    projected.data[loop.index].uv=(x/480,1-y/480)
mesh.uv_layers.active_index=0
tree=BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(f.vertices) for f in mesh.polygons])
weights=mesh.color_attributes.new(name='Paint visibility',type='FLOAT_COLOR',domain='POINT')
for v in mesh.vertices:
    p=v.co
    hit=tree.ray_cast(Vector((p.x,-3,p.z)),Vector((0,1,0)))[0]
    visible=hit is not None and abs(hit.y-p.y)<.045
    amount=smooth((.14-v.normal.y)/.65) if visible else 0
    # The light neutral backdrop sits just outside the hair in the painting.
    # At grazing edges retain the sculpt's side colour wherever projection
    # would otherwise stamp that backdrop onto brown hair or beard.
    x,y = np.clip(np.rint(pixel(p)/.75).astype(int),0,639)
    r,g,b = artwork[y,x,:3]
    if y < 515 and r > .32 and max(r,g,b)-min(r,g,b) < .095:
        amount = 0
    weights.data[v.index].color=(amount,amount,amount,1)
    # The jaw, hair and beard follow the skull rigidly. Only the neck blends.
    if p.z>.80 or (p.y<-.32 and p.z>.30):
        body.vertex_groups['Head'].add([v.index],1,'REPLACE')
        body.vertex_groups['Shoulders'].add([v.index],0,'REPLACE')

# Bake the camera projection and the original side colour into a single UV texture.
bake_mat=material('Camera paint with side blend',reference,projected.name)
nt=bake_mat.node_tree
paint=next(n for n in nt.nodes if n.type=='TEX_IMAGE')
side=nt.nodes.new('ShaderNodeTexImage');side.image=side_texture
uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap'
nt.links.new(uv.outputs['UV'],side.inputs['Vector'])
mask=nt.nodes.new('ShaderNodeVertexColor');mask.layer_name=weights.name
mix=nt.nodes.new('ShaderNodeMixRGB')
nt.links.new(mask.outputs['Color'],mix.inputs[0])
nt.links.new(side.outputs['Color'],mix.inputs[1])
nt.links.new(paint.outputs['Color'],mix.inputs[2])
nt.links.new(mix.outputs[0],next(n for n in nt.nodes if n.type=='EMISSION').inputs[0])
body.data.materials[0]=bake_mat
lid_mat=material('Reference-painted eyelids',reference,projected.name)
body.data.materials[1]=lid_mat
atlas=bpy.data.images.new('Fitted clay colour',2048,2048,alpha=False)
for mat in (lid_mat,bake_mat):
    target=mat.node_tree.nodes.new('ShaderNodeTexImage')
    target.image=atlas
    mat.node_tree.nodes.active=target
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True);bpy.context.view_layer.objects.active=body
scene.render.engine='CYCLES';scene.cycles.samples=1
bpy.ops.object.bake(type='EMIT',margin=8,uv_layer='UVMap')
atlas.pack()
body.data.materials[0]=material('Baked clay studio colour',atlas,'UVMap')
# Returning the collar to the projected UVs keeps razor-thin eyelid detail crisp.
for n in list(lid_mat.node_tree.nodes):
    if n.type=='TEX_IMAGE' and n.image==atlas: lid_mat.node_tree.nodes.remove(n)
scene.view_settings.view_transform='Standard'
scene.render.film_transparent=True
scene.camera.data.ortho_scale=2.2
scene.render.resolution_x=640;scene.render.resolution_y=640
scene.render.resolution_percentage=100
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type in {'MESH','EMPTY','ARMATURE'}:obj.select_set(True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.export_scene.gltf(filepath=str(WEB/'clay-head-study.glb'),export_format='GLB',use_selection=True,
                          export_animations=False,export_image_format='JPEG',export_jpeg_quality=88,
                          export_yup=True,export_vertex_color="NONE")
# Keep the registration image accessible for sculpt edits.
ref=bpy.data.objects.new('Clay reference • front camera',None);scene.collection.objects.link(ref)
ref.empty_display_type='IMAGE';ref.data=reference;ref.empty_display_size=2.2
ref.rotation_euler=(math.pi/2,0,0);ref.location=(0,.95,1);ref.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'clay-head-study.blend'),compress=True)
scene.cycles.samples=4
scene.render.filepath=str(Path(tempfile.gettempdir())/'clay-head-study-front.png')
bpy.ops.render.render(write_still=True)
