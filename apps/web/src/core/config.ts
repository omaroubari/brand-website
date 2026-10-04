import { brandtreeConfigSchema } from "brandtree";
import authoredConfig from "../../brandtree.config";

/** Resolve schema defaults once before the web app composes routes and layouts. */
export default brandtreeConfigSchema.parse(authoredConfig);
