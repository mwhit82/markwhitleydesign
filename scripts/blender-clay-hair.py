"""Paint individual silver fibres into the projected clay colour in reference pixels."""
import bpy
import numpy as np


def hair_projection(artwork):
    paint = artwork.copy()
    # Extend the ginger edge just beyond each temple. A glancing triangle
    # can otherwise pick up a narrow stripe of the grey photographic backdrop.
    for y in range(109, 243):
        for start, stop, step in ((154, 215, 1), (471, 415, -1)):
            xs = np.arange(start, stop, step)
            rgb = artwork[y, xs, :3]
            hair = np.flatnonzero((rgb[:, 0]-rgb[:, 2] > .20) & (rgb[:, 1] < .62))
            if hair.size:
                edge = xs[hair[0]]
                padding = np.arange(0, 10)
                paint[y, edge-step*padding] = artwork[y, edge+step*(2+padding//3)]

    # Guides run root to tip along a single curl. Widths and strengths vary
    # between fibres, and each path snaps gently to its own painted highlight.
    guides = [
        ((202,141), (189,152), (184,171), 1.5,.76),
        ((190,167), (179,185), (178,204), 1.35,.85),
        ((193,196), (183,212), (183,232), 1.6,.76),
        ((190,226), (184,240), (188,253), 1.05,.60),
        ((430,144), (442,154), (447,171), 1.5,.76),
        ((435,170), (447,188), (449,209), 1.35,.85),
        ((440,199), (445,222), (447,235), 1.55,.77),
        ((443,224), (447,239), (445,254), 1.05,.61),
        ((244,387), (241,405), (228,416), 1.45,.77),
        ((273,415), (264,437), (254,445), 1.65,.86),
        ((286,452), (277,465), (277,481), 1.2,.73),
        ((326,453), (333,469), (320,486), 1.4,.70),
        ((367,414), (380,432), (373,451), 1.55,.84),
        ((398,439), (407,455), (398,465), 1.25,.77),
        ((423,384), (424,401), (435,414), 1.4,.79),
    ]
    light = paint[:,:,:3] @ np.array([.30,.55,.15])
    for root, bend, tip, width, strength in guides:
        t = np.linspace(0, 1, 96)[:,None]
        path = (1-t)**2*root + 2*t*(1-t)*bend + t*t*tip
        rows = np.arange(root[1],tip[1]+1)
        centre = np.interp(rows,path[:,1],path[:,0])
        reach = np.arange(-2,3)
        nearby = np.rint(centre[:,None]).astype(int)+reach
        ridge = reach[np.argmax(light[rows[:,None],nearby]-.014*abs(reach),axis=1)]
        centre += np.convolve(ridge,[.1,.2,.4,.2,.1],mode='same')
        along = (rows-root[1])/(tip[1]-root[1])
        taper = np.sin(np.pi*along)**.55
        cols = np.arange(int(centre.min())-5,int(centre.max())+6)
        distance = (cols-centre[:,None])/(.23+width*taper[:,None])
        stroke = strength*taper[:,None]*np.exp(-1.25*distance**2)
        area = np.ix_(rows,cols)
        rgb = paint[area][:,:,:3]
        # Carry across the fibre's own light and shadow, with a warm, mid-grey pigment.
        silver = (.22+.87*light[area][:,:,None])*np.array([1.035,1,.96])
        paint[rows[:,None],cols,:3] = rgb+(silver-rgb)*stroke[:,:,None]

    image = bpy.data.images.new('Clay hair with scattered silver',640,640,alpha=False)
    image.pixels.foreach_set(np.ascontiguousarray(paint[::-1]).ravel())
    image.pack()
    return image
