"""Build the preview's depth-shaped office backplate in the portrait camera."""
import bpy


def build_studio(image_path, make_material):
    image = bpy.data.images.load(str(image_path))
    image.pack()
    # Front-facing UVs match the photo exactly at rest. The depth of the
    # ceiling, floor and side walls converges at the rear glazing. Extra image
    # outside the camera gate covers both extremes of the camera motion.
    columns, rows = 30, 30
    verts, faces = [], []
    for j in range(rows+1):
        v = j/rows
        for i in range(columns+1):
            u = i/columns
            floor = max(0, (.42-v)/.42)
            ceiling = max(0, (v-.80)/.20)
            side_wall = max(0, (u-.68)/.32)
            desk = max(0, (.32-u)/.32) * min(1, max(0, (.58-v)/.18))
            proximity = min(1, max(floor, ceiling, side_wall, desk))
            depth = 3.75 - 2.1*proximity
            verts.append(((u-.5)*2.48, depth, (v-.5)*2.48))
            if i and j:
                k=j*(columns+1)+i
                faces.append((k-columns-2,k-columns-1,k,k-1))
    mesh = bpy.data.meshes.new('Glazing, floors and walls')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    room = bpy.data.objects.new('OfficeParallax', mesh)
    bpy.context.collection.objects.link(room)
    room.location.z = 1
    uv = mesh.uv_layers.new(name='Office photograph')
    for loop in mesh.loops:
        j,i = divmod(loop.vertex_index,columns+1)
        uv.data[loop.index].uv = (i/columns,j/rows)
    mesh.materials.append(make_material('Daylit oak studio', image, uv.name))
