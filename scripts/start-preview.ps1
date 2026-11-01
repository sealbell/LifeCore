$ErrorActionPreference = 'Stop'
$taskInstall = Join-Path $env:LOCALAPPDATA 'Programs/DeepSeek Harness'
if ($env:DSH_INSTALL_DIR) { $taskInstall = $env:DSH_INSTALL_DIR }
$taskNode = Join-Path $taskInstall 'resources/runtime/primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Install DSH first, or set DSH_INSTALL_DIR.' }
& $taskNode (Join-Path $PSScriptRoot 'start-dsh.mjs')
exit $LASTEXITCODE
