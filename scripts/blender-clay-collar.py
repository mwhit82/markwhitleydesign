"""Lower bust for the clay portrait, in the front reference's 640 px coordinates."""
import math

import bmesh
import bpy
import numpy as np

UNIT = 2.2 / 640
JAW_X = [193, 205, 215, 229, 246, 267, 288, 307, 326, 345, 368, 389, 407, 423, 437, 449]
JAW_Y = [403, 439, 456, 472, 486, 499, 509, 515, 517, 516, 509, 498, 483, 462, 438, 407]


def beard_edge(x):
    return np.interp(x, JAW_X, JAW_Y)


def trim_scan(bm, head_group, shoulders_group):
    # A single shared cut follows the underside of the jaw around to the nape.
    # Flatten its curved cutting surface temporarily so the new rim is continuous.
    def height(y):
        return 1 + (320 - np.interp(y, [-.72, -.54, -.38, -.21, .12, .56],
                                          [522, 519, 493, 445, 405, 396])) * UNIT

    for v in bm.verts:
        v.co.z -= height(v.co.y)
    result = bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                                    plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    rim = [e for e in result['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=rim)
    weights = bm.verts.layers.deform.verify()
    for v in bm.verts:
        v.co.z += height(v.co.y)
        v[weights][head_group] = 1
        v[weights][shoulders_group] = 0


def build_lower_bust(rig, art, make_material):
    # Each ring is radius in image pixels, depth in scene units, side height,
    # front drop and fraction following the skull. Shared rings stitch the skin,
    # binding and shirt together. The shoulder loops stay planted.
    rings = [
        (86, .23, 342, 25, 1), (94, .255, 378, 32, 1),
        (100, .27, 406, 43, .97), (104, .27, 427, 60, .75),
        (108, .285, 444, 78, .28), (112, .30, 454, 98, .035),
        (113.5, .307, 453, 98, 0), (117, .32, 453, 102, 0),
        (128, .35, 457, 111, 0), (135, .36, 460, 113, 0),
        (168, .40, 475, 130, 0), (220, .45, 502, 145, 0),
        (267, .49, 527, 155, 0), (295, .54, 548, 160, 0),
        (324, .57, 603, 144, 0), (345, .58, 687, 120, 0)
    ]
    collar = 5
    segments = 80

    def position(ring, a):
        radius, depth, side, drop, _ = ring
        front = np.maximum(0, np.cos(a))
        return 320 + radius*np.sin(a), .02 - depth*np.cos(a), side + drop * front**1.12

    verts, faces = [], []
    for row, ring in enumerate(rings):
        for col in range(segments):
            x, y, py = position(ring, math.tau*(col/segments-.5))
            verts.append(((x-320)*UNIT, y, 1+(320-py)*UNIT))
            if row:
                k = (row-1)*segments
                nxt = (col+1) % segments
                faces.append((k+col, k+col+segments, k+nxt+segments, k+nxt))
    mesh = bpy.data.meshes.new('Neck through crewneck binding to shoulders')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bust = bpy.data.objects.new('Neck and cotton crewneck', mesh)
    bpy.context.collection.objects.link(bust)
    bust.parent = rig
    modifier = bust.modifiers.new('Portrait weights', 'ARMATURE')
    modifier.object = rig
    head = bust.vertex_groups.new(name='Head')
    planted = bust.vertex_groups.new(name='Shoulders')
    for row, ring in enumerate(rings):
        ids = list(range(row*segments,(row+1)*segments))
        head.add(ids, ring[-1], 'REPLACE')
        planted.add(ids, 1-ring[-1], 'REPLACE')
    uv = mesh.uv_layers.new(name='Garment UV')
    for f in mesh.polygons:
        row, col = divmod(f.index, segments)
        f.use_smooth = True
        for loop, (u,v) in zip(f.loop_indices, [(col,row),(col,row+1),(col+1,row+1),(col+1,row)]):
            uv.data[loop].uv = (u/segments, 1-v/(len(rings)-1))

    # Unwrap the clean skin and cotton independently. This gives the throat real
    # skin under the moving beard without baking a second, stationary beard on it.
    w, h = 1024, 512
    angle = math.tau*((np.arange(w)+.5)/w-.5)
    dark = (art[:,:,:3].max(2) < .29) & (np.ptp(art[:,:,:3], axis=2) < .078)
    cloth = np.where(dark[443:].any(axis=0), 443+dark[443:].argmax(axis=0), 639)
    def sample(x,y):
        return art[np.clip(np.rint(y).astype(int),0,639), np.clip(np.rint(x).astype(int),0,639)].copy()
    pixels = np.ones((h,w,4), dtype=np.float32)
    for iy in range(h):
        t = (iy+.5)/h*(len(rings)-1)
        row = int(t)
        f = t-row
        ring = np.array(rings[row])*(1-f) + np.array(rings[row+1])*f
        x, _, py = position(ring, angle)
        if t < collar:
            sx = np.clip(x, 222, 417)
            lower = np.interp(sx, np.arange(640), cloth)-4
            upper = np.minimum(lower-4, beard_edge(sx)+5)
            # Repeat natural skin below the jaw, darkening the recessed upper throat.
            height = np.clip((t-2.6)/(collar-2.6),0,1)
            sy = upper + (lower-upper)*height
            color = sample(sx,sy)
            clearance = np.maximum(0, py-beard_edge(x))
            shadow = 1-.24*np.exp(-clearance/14)
            color[:,:3] *= ((.78+.22*height)*shadow)[:,None]
        else:
            sx = np.clip(x, 2, 637)
            # The cloth texture starts at the inner binding. Track it outwards
            # with each ring, retaining the original knit and shoulder seams.
            inner_x, _, inner_y = position(rings[collar],angle)
            anchor = np.interp(inner_x, np.arange(640), cloth)
            correction = np.clip(1-(t-collar)/4,0,1)
            projected = py+(anchor-inner_y)*correction+2
            surface = np.interp(sx,np.arange(640),cloth)+2
            sy = surface+np.abs(projected-surface)
            color = sample(sx,np.minimum(sy,636))
        pixels[h-1-iy] = color
    image = bpy.data.images.new('Throat and cotton colour',w,h,alpha=False)
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    mesh.materials.append(make_material('Painted skin and cotton',image,uv.name))
