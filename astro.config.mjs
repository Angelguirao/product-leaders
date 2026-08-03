// @ts-check
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://product-leaders.vercel.app",
  integrations: [
    sitemap(),
    pagefind({
      indexConfig: {
        rootSelector: "main",
        excludeSelectors: [".site-header", ".site-footer", ".skip", ".grain"],
      },
    }),
  ],
});
