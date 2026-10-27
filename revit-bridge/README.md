# Local Revit 2019 bridge

The add-in exports the open Revit model to IFC using Revit 2019's installed IFC exporter. It does not upload the RVT or contact Autodesk services. Lumen / Field renders the exported IFC with its existing local Web-IFC viewer.

## Install once

The installer needs Revit 2019 and the Windows .NET Framework C# compiler. It compiles against the Revit API installed on this computer and registers the add-in for the current Windows user; no Visual Studio or network service is needed. Conversion itself runs inside Revit and works offline.

From the repository root, run PowerShell:

```powershell
.\revit-bridge\install-revit2019.ps1
```

Close and reopen Revit after installation.

## Export and render

1. Upload the `.rvt` into its project in Lumen / Field. The app keeps the original in IndexedDB and, when the local API is running, in local API storage.
2. Open that model in Revit 2019.
3. Choose **Add-Ins → Lumen / Field: Export IFC** and save the `.ifc` file.
4. Return to the project and choose the exported IFC. The IFC and later snapshots are stored locally and can be used without a network connection.

The viewer currently enforces a 64 MiB IFC preview limit. If Revit produces a larger file, reduce the export detail or split the model before importing it. Revit 2019 IFC export settings can affect the result; inspect the exported IFC for required categories and geometry.
