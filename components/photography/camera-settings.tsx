import type { Photograph } from "@/data/photography";
import styles from "./photography.module.css";

export function CameraSettings({ photo }: { photo: Photograph }) {
  const settings = photo.cameraSettings;
  if (!settings) return null;
  const { aperture, shutterSeconds, iso } = settings;
  const shutter = shutterSeconds === undefined ? undefined : shutterSeconds < 1
    ? `1/${Number((1 / shutterSeconds).toPrecision(4))} s`
    : `${Number(shutterSeconds.toPrecision(4))} s`;
  const fields = [
    aperture !== undefined ? { label: "Aperture", value: `f/${Number(aperture.toPrecision(3))}` } : null,
    shutter ? { label: "Shutter speed", value: shutter } : null,
    iso !== undefined ? { label: "ISO", value: `ISO ${iso}` } : null,
  ].filter(field => field !== null);
  if (!fields.length) return null;
  return <span className={styles.cameraSettings}>{fields.map((field, index) => <span key={field.label}>
    {index > 0 && <span aria-hidden="true"> · </span>}<span aria-label={`${field.label}: ${field.value}`}>{field.value}</span>
  </span>)}</span>;
}
