$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputDir = Join-Path $projectRoot '.handoff'
$stage = Join-Path $projectRoot ('.handoff-source-' + [guid]::NewGuid().ToString('N'))
$archive = Join-Path $outputDir ('Sentinel-codigo-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss') + '.zip')

try {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  & (Join-Path $PSScriptRoot 'New-SentinelSource.ps1') -Destination $stage | Out-Null
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $archive)

  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  try {
    $unsafe = $zip.Entries | Where-Object {
      $_.FullName -match '(?i)(^|/)(\.env|\.git/|node_modules/|\.next/|student-contacts\.json$|professor-contacts\.json$)' -or
      $_.FullName -match '(?i)\.(xlsx?|csv|pdf)$'
    }
    if ($unsafe) { throw 'El paquete contiene archivos excluidos. Se debe revisar antes de compartirlo.' }
  } finally { $zip.Dispose() }
  Write-Output $archive
} finally {
  if (Test-Path -LiteralPath $stage) {
    $resolved = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stage).Path)
    $insideProject = $resolved.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $insideProject -or -not (Split-Path $resolved -Leaf).StartsWith('.handoff-source-')) {
      throw 'No se pudo verificar la carpeta temporal para limpiarla.'
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
