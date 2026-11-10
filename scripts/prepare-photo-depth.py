"""Optional local-only depth pilot. Run with the isolated Python environment documented in the photo README."""
import hashlib
import io
import json
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'depth-anything/Depth-Anything-V2-Small-hf'
REVISION = '5426e4f0f36572d16453bbda7a8389317b1bef99'
IDS = ['nyc-may-day-3-96', 'hamsterley-autumn-fox-4', 'peak-district-dxr-uk-28']
processor = AutoImageProcessor.from_pretrained(MODEL, revision=REVISION, use_fast=False)
model = AutoModelForDepthEstimation.from_pretrained(MODEL, revision=REVISION, use_safetensors=True).eval()
photos = json.loads((ROOT / 'data/photography-generated.json').read_text())['photos']
output = ROOT / 'public/images/photography/depth'
output.mkdir(parents=True, exist_ok=True)
entries = []
for photo_id in IDS:
    photo = next(p for p in photos if p['id'] == photo_id)
    candidates = sorted((v for v in photo['variants'] if v['format'] == 'webp'), key=lambda v: v['width'])
    source = next((v for v in candidates if v['width'] >= 1600), candidates[-1])
    file = ROOT / 'public' / source['src'].lstrip('/')
    image = Image.open(file).convert('RGB')
    inputs = processor(images=image, return_tensors='pt')
    with torch.inference_mode():
        prediction = model(**inputs).predicted_depth
    size = (round(image.height * min(1, 1024/max(image.size))), round(image.width * min(1, 1024/max(image.size))))
    depth = torch.nn.functional.interpolate(prediction.unsqueeze(1), size=size, mode='bicubic', align_corners=False).squeeze().numpy()
    low, high = np.percentile(depth, (1, 99))
    depth = np.clip((depth-low)/max(high-low, 1e-6), 0, 1)
    encoded = io.BytesIO()
    Image.fromarray(np.uint8(depth*255)).save(encoded, format='PNG', optimize=True)
    digest = hashlib.sha256(encoded.getvalue()).hexdigest()[:16]
    name = f'{photo_id}-{digest}.png'
    (output/name).write_bytes(encoded.getvalue())
    entry = {'id':photo_id,'src':f'/images/photography/depth/{name}','imageSrc':source['src'],'width':size[1],'height':size[0],'bytes':(output/name).stat().st_size,'strength':0.014}
    entries.append(entry)
    print(f"Prepared {photo['title']}: {entry['bytes']} bytes", flush=True)
manifest = {'version':1,'model':MODEL,'revision':getattr(model.config, '_commit_hash', None),'license':'Apache-2.0','photos':entries}
(ROOT/'data/photography-depth.json').write_text(json.dumps(manifest, indent=2)+'\n')
