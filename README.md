# Lumen / Field

**A BIM visualization studio for small architecture practices.** Load an IFC or a Revit `.rvt` project, pair it with a reference image and scene prompt, inspect the model in the in-app 3D viewer, and save renders plus client review history. Revit 2019 exports RVT models to IFC locally; the browser viewer then renders the IFC without sending the model to a cloud service.

## Problem and customer

Independent architects and small practices need a faster path from a BIM model to a visual their client can review. Lumen / Field keeps the IFC, reference, scene settings, render images, prompts, client notes, and approvals attached to one project.

The first customer is an independent architect or a 1–10 person practice preparing residential and small commercial concepts. A possible business model is a free solo tier followed by paid project limits, render credits, shared review, and team storage. Pricing is a hypothesis, not a validated plan.

## Run locally on Windows

Prerequisites: Node 20.19+ and Python 3.11+ (`py --version`). Docker and Blender are not required for this in-app WebGL version.

```powershell
npm install
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Start each service in a separate PowerShell terminal:

```powershell
npm run api
```

```powershell
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`. The API is local at `http://127.0.0.1:8000`; Vite proxies `/api` to it. API documentation is available at `http://127.0.0.1:8000/docs`.

### Set up local Revit export

RVT conversion requires Revit 2019 and a one-time install of the local add-in. From the repository root, run `.\revit-bridge\install-revit2019.ps1` in PowerShell, then restart Revit. The installer uses the Windows .NET Framework compiler and installed Revit API; no Visual Studio or network service is needed. The export itself runs inside Revit and works offline. See [revit-bridge/README.md](revit-bridge/README.md) for the full workflow. RVT uploads are limited to 300 MiB and IFC browser previews to 64 MiB.

```powershell
.venv\Scripts\python.exe -m pytest backend\tests -q
npm run test
npm run build
```

## Workflow

1. Create or open a project.
2. Upload an `.ifc` (IFC4 or IFC2x3) or a Revit `.rvt` file, plus a JPG, PNG, or WebP reference image. For RVT, open the source in Revit 2019, use **Add-Ins → Lumen / Field: Export IFC**, then load the exported IFC into the project.
3. Enter a scene prompt and choose camera, lighting, environment, ground, and material appearance. The reference image supplies editable colors for detected IFC building roles; its sky and greenery colors are excluded from the building palette.
4. Review the IFC summary before rendering. The browser reports units, dimensions, storeys, element classes, material and space properties, building-use signals, a likely entrance, site data, and any warnings. Confirm the detected building type or choose one when confidence is low. Use the Visible floor control to isolate a storey when the model includes IFC containment metadata.
5. Review the proposed planting, people, vehicles, paths, boundary and ground cover. Edit each building type's surroundings rule, toggle scene elements, and use the layout seed to reproduce or regenerate the arrangement. These choices require a fresh confirmation before rendering.
6. Orbit the parsed source model in the Three.js canvas; render a PNG from the locked IFC scene plus its separate site-context layer and browse saved renders in the scene tabs.
7. Use the lower-left camera button for repeatable environment snapshots; download each saved PNG from its selected snapshot.
8. Save prompt versions, add client feedback, approve the direction, and export the visualization brief.

## Geometry immutability

- Web-IFC parses the selected IFC in the browser and supplies the source vertex/index buffers and IFC placement matrices. For an RVT project, the selected source is the IFC exported locally by Revit 2019; Three.js uses that IFC geometry without AI-generated or prompt-authored building geometry.
- IFC mesh transforms are fixed (`matrixAutoUpdate = false`). Camera controls, lighting, and presentation materials do not move, scale, add, or reshape model geometry.
- The prompt can set scene atmosphere but cannot change IFC geometry or recolor every mesh. The API accepts presentation settings, building-role colors, a reviewed building type, bounded surroundings rules, a deterministic layout seed, and context toggles; unknown geometry-edit fields are rejected.
- Ground, paths, trees, shrubs, people, vehicles, gates, and boundary elements are generated in a sibling Three.js presentation group. They are not written into the IFC or included in its geometry hash. The arrangement uses parsed geometry bounds, an IFC site shape when it provides a usable plot, the selected building type, and a saved seed. It is a visual staging aid, not a surveyed site plan or code-compliance result.
- The local API stores uploaded RVT and IFC files as read-only assets and verifies the IFC's SHA-256 digest before job creation, job start, and result acceptance. This covers the server-side IFC file only; it does not cryptographically bind the browser PNG capture to the geometry that was rendered.

The current render is a real-time WebGL image captured from the in-app IFC scene. It is not a path-traced Lumion-quality image and no generative AI is currently used. Reference colors are sampled from a central image crop after removing likely sky, greenery, and extreme colors; the palette is a visual heuristic and can be edited by building role. IFC class and property metadata guide the role assignment. Missing or ambiguous IFC metadata can leave an element on its original source color. Type detection and entrance selection are also heuristics: review the report, correct the building type when needed, and check the approach against the model before rendering. Generated entourage uses approximate dimensions in metres and avoids known building bounds, but does not provide survey, accessibility, traffic, planting-species, or code review. Present the current product as a geometry-safe visualization pipeline; AI-assisted material and context suggestions are future work.

For an IFC review, repeat the same steps with a residential model, a public or commercial model, and a model with weak or missing use metadata. Confirm the type and unit warnings, inspect the entrance and boundary, toggle each context group, regenerate with the same seed to check repeatability, then change the seed to check placement changes. Compare the model before and after rendering; source mesh positions and dimensions must remain identical. The browser build and API schema checks are available in the local commands above. IFC-specific placement needs real files and visual inspection in the viewer.

## Local architecture

- **Frontend:** React 19, Vite, Tailwind CSS, Three.js, and Web-IFC WASM. The IFC/Three.js bundle is lazy-loaded only when the studio opens.
- **API:** FastAPI and SQLite provide optional upload synchronization, immutable asset metadata, SHA-256 verification, render-job records, and stored PNG results. The browser can render and save snapshots without the API.
- **Offline storage:** IFCs, RVTs, references, and snapshots are saved in browser IndexedDB when storage is available. The production service worker caches the app shell and viewer/WASM files as they are used. Revit 2019 exports RVT to IFC on this device; model viewing and snapshots then run locally. Interactive IFC previews are capped at 64 MiB to protect browser memory. The preview cap is enforced before Web-IFC parses the model. Starter covers are local SVG files and are cached with the same-origin app assets.
- **Local API storage:** synchronized uploads, SQLite records, and server-side PNGs live under ignored `backend/.data/`. The API binds to `127.0.0.1`; it is a single-user local service, not an internet-facing deployment.
- Tests under src/lib cover IFC analysis, reference palette mapping, and seeded context generation. Backend API tests cover upload validation, cached hash checks, presentation settings, tamper rejection, and render completion. GitHub Actions runs both suites and the production build.

The example IFC used for development testing stays out of the repository. IFC viewing and local Revit conversion need no cloud service. Sign-in, account, and subscription pages are demo UI only; they do not authenticate users or process payments.

## Production path

1. Add user authentication, organization/tenant authorization, PostgreSQL, and private object storage.
2. Keep render-job records and status transitions, but move processing to a durable queue and independent workers.
3. Add background high-quality rendering only if needed. Workers must load the original IFC, keep geometry immutable, and report the source hash plus output asset ID.
4. Validate IFC conversion coverage, render quality, turnaround, hardware needs, and willingness to pay with pilot studios before adding subscription billing.

## Five-minute demo outline

- **0:00–0:45:** Explain the small-practice BIM-to-client-visualization problem.
- **0:45–1:30:** Show React/Vite, the local FastAPI service, SQLite asset/job records, and Web-IFC/Three.js viewer.
- **1:30 to 3:45:** Upload an IFC and reference, inspect and orbit the model, change camera, light, and material presentation, render a PNG, save a prompt version, add feedback, approve, refresh, and export the brief. Explain that the API checks the stored IFC file and that sign-in, account, and subscription are demo UI only.
- **3:45–4:30:** Describe the independent-practice customer and unvalidated subscription/render-credit hypothesis.
- **4:30–5:00:** Explain how the local API and SQLite can evolve to authenticated storage and queued render workers without allowing those workers to modify model geometry.

## Project layout

```text
backend/
  main.py                 Local API, SQLite records, IFC/RVT uploads, hash checks
  run-api.js              Cross-platform virtualenv launcher
  requirements.txt        FastAPI and test dependencies
  tests/test_api.py       Asset/job integrity tests
revit-bridge/             Revit 2019 add-in for local RVT-to-IFC export
  README.md               Local install and export workflow
  install-revit2019.ps1   Build and register the Revit 2019 command
  2019/                   Add-in source, project, and manifest template
src/
  components/IfcViewer.jsx    Web-IFC parsing and locked Three.js scene
  pages/Dashboard.jsx         Project list, search, filters, creation
  pages/Workspace.jsx         IFC inputs, render canvas, review controls
  App.jsx                     Project metadata persistence and navigation
```
