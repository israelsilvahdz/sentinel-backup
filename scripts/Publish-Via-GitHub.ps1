$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stage = Join-Path $projectRoot ('.publish-git-' + [guid]::NewGuid().ToString('N'))
$repo = 'https://github.com/israelsilvahdz/sentinel-backup.git'

function Assert-Git([string]$description) {
  if ($LASTEXITCODE -ne 0) { throw "$description falló. No se continuó con la publicación." }
}

try {
  & (Join-Path $PSScriptRoot 'New-SentinelSource.ps1') -Destination $stage | Out-Null
  & git -C $stage init -q
  Assert-Git 'La inicialización de Git'
  & git -C $stage remote add origin $repo
  Assert-Git 'La configuración del repositorio'
  & git -C $stage fetch --no-tags origin main:refs/remotes/origin/main codex/portable-2026:refs/remotes/origin/codex/portable-2026
  Assert-Git 'La lectura de las ramas remotas'
  & git -C $stage add -A
  Assert-Git 'La preparación del código'
  $tree = (& git -C $stage write-tree).Trim()
  Assert-Git 'La creación del árbol'
  foreach ($branch in @('main', 'codex/portable-2026')) {
    $parent = (& git -C $stage rev-parse "refs/remotes/origin/$branch").Trim()
    Assert-Git "La lectura de $branch"
    $commit = (& git -C $stage -c user.name=Codex -c user.email=codex@users.noreply.github.com commit-tree $tree -p $parent -m 'Add professional student support').Trim()
    Assert-Git "El commit para $branch"
    & git -C $stage push origin "${commit}:refs/heads/$branch"
    Assert-Git "La publicación de $branch"
    Write-Output "$branch $commit"
  }
} finally {
  if (Test-Path -LiteralPath $stage) {
    $resolved = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stage).Path)
    $insideProject = $resolved.StartsWith($projectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $insideProject -or -not (Split-Path $resolved -Leaf).StartsWith('.publish-git-')) { throw 'No se pudo verificar la carpeta temporal para limpiarla.' }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}
