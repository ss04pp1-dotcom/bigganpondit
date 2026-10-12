import { defineOpenNextConfig } from "@opennextjs/cloudflare";

export default defineOpenNextConfig({
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
});
