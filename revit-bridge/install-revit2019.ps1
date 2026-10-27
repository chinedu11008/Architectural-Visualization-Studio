param(
    [string]$RevitInstallDir = "C:\Program Files\Autodesk\Revit 2019"
)

$ErrorActionPreference = "Stop"
$templateFile = Join-Path $PSScriptRoot "2019\LumenField.Revit2019.addin.template"

if (-not (Test-Path (Join-Path $RevitInstallDir "RevitAPI.dll"))) {
    throw "Revit 2019 API was not found at '$RevitInstallDir'. Install Revit 2019 or pass its installation folder."
}
if (-not (Test-Path (Join-Path $RevitInstallDir "RevitAPIUI.dll"))) {
    throw "The Revit 2019 UI API was not found at '$RevitInstallDir'. Check the Revit installation folder."
}

$compilerCandidates = @(
    (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
    (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$compiler = $compilerCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $compiler) {
    throw "The .NET Framework C# compiler was not found. Install the .NET Framework developer tools, then run this script again."
}

$buildDirectory = Join-Path $env:TEMP ("lumen-field-revit2019-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $buildDirectory | Out-Null
$assembly = Join-Path $buildDirectory "LumenField.Revit2019.dll"
$api = Join-Path $RevitInstallDir "RevitAPI.dll"
$apiUi = Join-Path $RevitInstallDir "RevitAPIUI.dll"
$sourceFile = Join-Path $PSScriptRoot "2019\ExportIfcCommand.cs"
$compilerArguments = @(
    "/nologo",
    "/target:library",
    ("/out:" + $assembly),
    ("/reference:" + $api),
    ("/reference:" + $apiUi),
    "/reference:System.Windows.Forms.dll",
    $sourceFile
)
try {
    & $compiler @compilerArguments
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $assembly)) {
        throw "The Lumen / Field Revit 2019 add-in did not compile successfully."
    }

    $installDirectory = Join-Path $env:LOCALAPPDATA "LumenField\Revit2019"
    $addinDirectory = Join-Path $env:APPDATA "Autodesk\Revit\Addins\2019"
    New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $addinDirectory -Force | Out-Null
    $installedAssembly = Join-Path $installDirectory "LumenField.Revit2019.dll"
    Copy-Item -LiteralPath $assembly -Destination $installedAssembly -Force

    $assemblyXml = [System.Security.SecurityElement]::Escape($installedAssembly)
    $manifest = [System.IO.File]::ReadAllText($templateFile).Replace("__LUMEN_ADDIN_ASSEMBLY__", $assemblyXml)
    $manifestPath = Join-Path $addinDirectory "LumenField.Revit2019.addin"
    [System.IO.File]::WriteAllText($manifestPath, $manifest, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Installed the Lumen / Field Revit 2019 add-in. Restart Revit and use Add-Ins > Lumen / Field: Export IFC."
} finally {
    $resolvedBuildDirectory = [System.IO.Path]::GetFullPath($buildDirectory)
    $temporaryRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
    if ($resolvedBuildDirectory.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedBuildDirectory -Recurse -Force -ErrorAction SilentlyContinue
    }
}
