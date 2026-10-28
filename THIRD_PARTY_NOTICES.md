# Third-party notices

## rvt-rs WebAssembly RVT parser

- Version: 0.10.0
- Source: https://github.com/DrunkOnJava/rvt-rs
- Source commit: `0cd60b7f9ed8b4e660d1abe1f63bf0c519286605`
- License: Apache License 2.0; full text is in [src/lib/rvt/LICENSE](src/lib/rvt/LICENSE).
- Bundled artifacts: `src/lib/rvt/pkg/`; the browser build is loaded only when an RVT is parsed.
- SHA-256 `rvt.js`: `CD8052A44D0E4CC490DC5EB1FC9B647EFF204B29A6CD5FA7C21C22760FDE8D71`.
- SHA-256 `rvt_bg-DEN9BM9G.wasm`: `CCC8EB0D5F04981BFC98D03340A3554B884E89FDF7E4C1FE0D090D7983F1F66B`.
- Runtime network access: none. The parser runs in a browser worker and receives the selected file bytes directly.

The parser project is independent and is not affiliated with Autodesk. Its Revit 2019–2022 element recovery is experimental; some geometry may be approximated or omitted.
