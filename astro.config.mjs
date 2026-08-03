// @ts-check
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://product-leaders-self.vercel.app",
  trailingSlash: "never",
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
