param([Parameter(Mandatory = $true)][string]$Destination)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targetRoot = [System.IO.Path]::GetFullPath($Destination)
$insideProject = $targetRoot.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
if (-not $insideProject) { throw 'El destino debe estar dentro de la carpeta del proyecto.' }
if (Test-Path -LiteralPath $targetRoot) { throw "El destino ya existe: $targetRoot" }

New-Item -ItemType Directory -Path $targetRoot | Out-Null

function Copy-ProjectFile([string]$relativePath) {
  $sourcePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) { throw "Falta un archivo del proyecto: $relativePath" }
  $targetPath = Join-Path $targetRoot $relativePath
  $targetParent = Split-Path $targetPath -Parent
  New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  Copy-Item -LiteralPath $sourcePath -Destination $targetPath
}

# Lista explícita para evitar Excel, contactos, cachés, secretos e historial Git.
@(
  'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'tailwind.config.ts',
  'postcss.config.mjs', 'components.json', 'apphosting.yaml', '.firebaserc',
  '.gitignore', 'README.md', 'public/tecmilenio-logo.png', 'public/tecmilenio-profesional.png',
  'docs/PROJECT_HANDOFF.md', 'tests/subject-risk.test.cjs', 'tests/professional-import.test.cjs',
  'scripts/New-SentinelSource.ps1', 'scripts/Publish-Sentinel.ps1', 'scripts/Publish-Via-GitHub.ps1',
  'scripts/Export-Sentinel.ps1'
) | ForEach-Object { Copy-ProjectFile $_ }

$sourceRoot = Join-Path $projectRoot 'src'
Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
  $_.Extension.ToLowerInvariant() -in @('.ts', '.tsx', '.css', '.ico', '.md')
} | ForEach-Object {
  $relativePath = $_.FullName.Substring($projectRoot.Length + 1)
  Copy-ProjectFile $relativePath
}

$firebaseConfig = @'
{
  "apphosting": [
    {
      "backendId": "sentinel-backup",
      "rootDir": ".",
      "alwaysDeployFromSource": true,
      "ignore": ["node_modules", ".git", ".next", "*.log", ".env*"]
    }
  ]
}
'@
Set-Content -LiteralPath (Join-Path $targetRoot 'firebase.json') -Value $firebaseConfig -Encoding UTF8

Write-Output $targetRoot
