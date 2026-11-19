# Edition seam

Everything that differs between the open-source build and HeadsApp Cloud lives behind
the files in this folder. The cloud repo replaces these files (and adds new routes in
new folders); the rest of the codebase is shared and merges cleanly from upstream.

Keep the exported names and signatures stable. If you need a new extension point,
add it here with a no-op default.
