## Why Ovellum?

Most documentation tools force you to choose. Either you generate everything from source and lose the human notes, or you hand-write every page and watch it quietly fall out of sync as the code moves on. Teams end up running two parallel worlds, (i) a generated API reference and (ii) a hand-written guide that's three versions behind reality.

Ovellum balances the tradeoff. It introduces a small tagging contract between the tool and the author. You mark sections of a page as yours; Ovellum updates everything around them and never touches the parts you own. When the underlying code changes such as a function renamed, a class removed, the prose is quarantined, surfaced in build summary, and left in version control so you can review what changed and decide what to do.

The same machinery doubles as a Jekyll-style static-site builder. Point Ovellum at a folder of Markdown files and it produces a deployable site: auto-generated sidebar nav, right-side “On this page” table of contents, syntax-highlighted code, auto/light/dark themes. No proprietary format. No runtime JavaScript for the parts the browser doesn’t need.

This site you’re reading was built by `ovellum build` from [`website/content/`](https://github.com/oinam/ovellum/tree/main/website/content) and deployed to GitHub Pages by a workflow that runs on every push to `main`.

The whole thing is dogfooded; if Ovellum had a bug, this site would have it too.
