## Why Ovellum?

Documentation tools today force a choice. Either you auto-generate from code
and lose the human voice, or you hand-write everything and watch it drift
from reality as the code moves. Teams end up maintaining two parallel
worlds — a generated API reference nobody reads, and a hand-written guide
that's quietly out of date.

Ovellum refuses that tradeoff. In **manual mode**, it's a clean Jekyll-style
site builder for purely hand-written docs. In **hybrid mode**, it merges
auto-generated API content with your prose using a tagging contract: you mark
sections as yours, and the tool respects those boundaries on every rebuild.

When source you've written about goes away, your prose isn't silently lost —
it's quarantined into a versioned archive so you can review what changed.

This site you're looking at right now is built with `ovellum build` in
manual mode from the Markdown files under
[`examples/manual-site/content/`](https://github.com/oinam/ovellum/tree/main/examples/manual-site/content).
