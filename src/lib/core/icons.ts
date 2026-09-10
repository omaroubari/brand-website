import {
  BookOpenIcon,
  CameraIcon,
  GlobeIcon,
  ImageIcon,
  MonitorIcon,
  PaletteIcon,
  PenNibIcon,
  PrinterIcon,
  ShapesIcon,
  SparkleIcon,
  SquaresFourIcon,
  TextAaIcon,
  type Icon,
} from "@phosphor-icons/react";

/**
 * The deliberately small icon set available to folder and page metadata.
 * Keep this explicit: metadata names are stable content API, while the icon
 * components remain tree-shakeable and cannot pull in the whole Phosphor set.
 */
export const contentIcons = {
  "book-open": BookOpenIcon,
  camera: CameraIcon,
  globe: GlobeIcon,
  image: ImageIcon,
  "layout-grid": SquaresFourIcon,
  monitor: MonitorIcon,
  palette: PaletteIcon,
  "pen-tool": PenNibIcon,
  printer: PrinterIcon,
  shapes: ShapesIcon,
  sparkles: SparkleIcon,
  type: TextAaIcon,
};

export type ContentIconName = keyof typeof contentIcons;

export function getContentIcon(name: ContentIconName): Icon {
  return contentIcons[name];
}
