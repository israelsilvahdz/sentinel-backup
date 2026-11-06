$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stage = Join-Path $projectRoot ('.deploy-run-' + [guid]::NewGuid().ToString('N'))

try {
  Push-Location $projectRoot
  try {
    & npm run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'La comprobación de tipos falló. No se publicará.' }
    & (Join-Path $PSScriptRoot 'New-SentinelSource.ps1') -Destination $stage | Out-Null
  } finally { Pop-Location }

  Push-Location $stage
  try {
    & node (Join-Path $projectRoot 'node_modules/next/dist/bin/next') build
    if ($LASTEXITCODE -ne 0) { throw 'La compilación falló. No se publicará.' }
    & node (Join-Path $projectRoot 'node_modules/firebase-tools/lib/bin/firebase.js') deploy --only apphosting:sentinel-backup --project tecmilenio-mdea --non-interactive
    if ($LASTEXITCODE -ne 0) { throw 'Firebase no confirmó la publicación.' }
  } finally { Pop-Location }
} finally {
  if (Test-Path -LiteralPath $stage) {
    $resolved = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stage).Path)
    $insideProject = $resolved.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $insideProject -or -not (Split-Path $resolved -Leaf).StartsWith('.deploy-run-')) {
      throw 'No se pudo verificar la carpeta temporal para limpiarla.'
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
