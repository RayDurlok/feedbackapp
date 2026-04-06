param(
	[string]$ProjectRoot = "O:\Nextcloud\06_Projekte\07_NextcloudFeedbackapp",
	[string]$AppName = "feedbackapp"
)

$ErrorActionPreference = "Stop"

$appRoot = Join-Path $ProjectRoot "custom_apps\$AppName"
$distRoot = Join-Path $ProjectRoot "dist"
$releaseRoot = Join-Path $distRoot $AppName
$zipPath = Join-Path $distRoot "$AppName.zip"

if (-not (Test-Path $appRoot)) {
	throw "App folder not found: $appRoot"
}

if (Test-Path $releaseRoot) {
	Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

if (Test-Path $zipPath) {
	Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

$include = @(
	"appinfo",
	"css",
	"js",
	"lib",
	"templates"
)

foreach ($entry in $include) {
	$source = Join-Path $appRoot $entry
	if (Test-Path $source) {
		Copy-Item -LiteralPath $source -Destination (Join-Path $releaseRoot $entry) -Recurse
	}
}

Compress-Archive -Path (Join-Path $releaseRoot "*") -DestinationPath $zipPath -Force

Write-Host "Created release folder: $releaseRoot"
Write-Host "Created zip: $zipPath"
