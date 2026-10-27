using System;
using System.IO;
using System.Windows.Forms;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace LumenField.Revit2019
{
    [Transaction(TransactionMode.Manual)]
    public sealed class ExportIfcCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            Document document = commandData.Application.ActiveUIDocument == null
                ? null
                : commandData.Application.ActiveUIDocument.Document;
            if (document == null)
            {
                message = "Open a Revit model before exporting it to Lumen / Field.";
                return Result.Failed;
            }

            string exportDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                "Lumen Field",
                "IFC Exports");
            Directory.CreateDirectory(exportDirectory);

            string defaultName = Path.GetFileNameWithoutExtension(document.PathName);
            if (String.IsNullOrWhiteSpace(defaultName))
            {
                defaultName = Path.GetFileNameWithoutExtension(document.Title);
            }
            if (String.IsNullOrWhiteSpace(defaultName))
            {
                defaultName = "Revit-Model";
            }

            string outputPath;
            using (var dialog = new SaveFileDialog())
            {
                dialog.Title = "Export IFC for Lumen / Field";
                dialog.Filter = "IFC model (*.ifc)|*.ifc";
                dialog.DefaultExt = "ifc";
                dialog.AddExtension = true;
                dialog.OverwritePrompt = true;
                dialog.InitialDirectory = exportDirectory;
                dialog.FileName = defaultName + ".ifc";
                if (dialog.ShowDialog() != DialogResult.OK)
                {
                    return Result.Cancelled;
                }
                outputPath = dialog.FileName;
            }

            string folder = Path.GetDirectoryName(outputPath);
            string name = Path.GetFileNameWithoutExtension(outputPath);
            try
            {
                bool exported;
                using (var transaction = new Transaction(document, "Export IFC for Lumen / Field"))
                {
                    if (transaction.Start() != TransactionStatus.Started)
                    {
                        throw new InvalidOperationException("Revit could not start the IFC export transaction.");
                    }

                    try
                    {
                        exported = document.Export(folder, name, new IFCExportOptions());
                    }
                    finally
                    {
                        if (transaction.GetStatus() == TransactionStatus.Started)
                        {
                            transaction.RollBack();
                        }
                    }
                }

                if (!exported || !File.Exists(outputPath))
                {
                    throw new IOException("Revit did not create the IFC file at the selected location.");
                }

                TaskDialog.Show(
                    "Lumen / Field",
                    "IFC export complete. Return to the project and choose this file:\n\n" + outputPath);
                return Result.Succeeded;
            }
            catch (Exception error)
            {
                message = error.Message;
                TaskDialog.Show("Lumen / Field IFC export failed", error.Message);
                return Result.Failed;
            }
        }
    }
}
