import { defineComponents } from "blume";
import ComponentPreview from "./components/ComponentPreview.astro";
import Sidebar from "./components/Sidebar.astro";

export default defineComponents({
  layout: { Sidebar },
  mdx: { ComponentPreview },
});
