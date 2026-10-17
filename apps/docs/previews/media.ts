import photo from "../assets/photography/photo-01.jpg";

// Keep the format precise across the Astro versions in this monorepo.
export const demoPhoto = { ...photo, format: "jpg" as const };
export { icons as demoIcons } from "../assets/icons";
