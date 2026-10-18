import portrait from "../assets/photography/persona-portrait.jpg";
import photo from "../assets/photography/photo-01.jpg";

// Keep the format precise across the Astro versions in this monorepo.
export const demoPortrait = { ...portrait, format: "jpg" as const };
export const demoPhoto = { ...photo, format: "jpg" as const };
export { icons as demoIcons } from "../assets/icons";
