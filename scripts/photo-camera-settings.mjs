// Read only the three exposure fields we publish. Never copy arbitrary EXIF tags.
export function cameraSettingsFromExif(exif) {
  if (!Buffer.isBuffer(exif)) return undefined;
  const start = exif.subarray(0, 6).equals(Buffer.from('Exif\0\0')) ? 6 : 0;
  const data = exif.subarray(start);
  const endian = data.toString('ascii', 0, 2);
  if (data.length < 8 || !['II', 'MM'].includes(endian)) return undefined;
  const u16 = offset => endian === 'II' ? data.readUInt16LE(offset) : data.readUInt16BE(offset);
  const u32 = offset => endian === 'II' ? data.readUInt32LE(offset) : data.readUInt32BE(offset);
  try {
    if (u16(2) !== 42) return undefined;
    const entries = offset => {
      if (offset < 8 || offset + 2 > data.length) return [];
      const count = u16(offset);
      if (count > 1024 || offset + 2 + count * 12 > data.length) return [];
      return Array.from({length: count}, (_, i) => offset + 2 + i * 12);
    };
    const root = entries(u32(4));
    const pointer = root.find(offset => u16(offset) === 0x8769 && u16(offset + 2) === 4 && u32(offset + 4) === 1);
    if (pointer === undefined) return undefined;
    const tags = entries(u32(pointer + 8));
    const value = (tag, types) => {
      const offset = tags.find(offset => u16(offset) === tag);
      if (offset === undefined || u32(offset + 4) !== 1) return undefined;
      const type = u16(offset + 2);
      if (!types.includes(type)) return undefined;
      if (type === 3) return u16(offset + 8);
      if (type === 4) return u32(offset + 8);
      const position = u32(offset + 8);
      if (position + 8 > data.length) return undefined;
      const denominator = u32(position + 4);
      return denominator ? u32(position) / denominator : undefined;
    };
    const settings = {};
    const aperture = value(0x829d, [5]);
    const shutterSeconds = value(0x829a, [5]);
    const iso = value(0x8827, [3, 4]);
    if (Number.isFinite(aperture) && aperture > 0 && aperture <= 128) settings.aperture = aperture;
    if (Number.isFinite(shutterSeconds) && shutterSeconds > 0 && shutterSeconds <= 86400) settings.shutterSeconds = shutterSeconds;
    if (Number.isInteger(iso) && iso > 0 && iso < 65535) settings.iso = iso;
    return Object.keys(settings).length ? settings : undefined;
  } catch {
    // Missing or malformed optional metadata must not prevent photo publication.
    return undefined;
  }
}
