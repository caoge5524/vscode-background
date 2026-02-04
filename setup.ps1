# VSCode Background Extension - Setup & Verification Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VSCode Background Extension" -ForegroundColor Cyan
Write-Host "Setup & Verification Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found" -ForegroundColor Red
    exit 1
}

# Check VSCode
Write-Host "Checking VSCode..." -ForegroundColor Yellow
try {
    $codeVersion = code --version
    Write-Host "✓ VSCode installed: $($codeVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "✗ VSCode not found or 'code' not in PATH" -ForegroundColor Red
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Compile TypeScript
Write-Host "`nCompiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ TypeScript compiled successfully" -ForegroundColor Green
} else {
    Write-Host "✗ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}

# Check if out directory exists
if (Test-Path "out") {
    Write-Host "✓ Output directory created: out/" -ForegroundColor Green
} else {
    Write-Host "✗ Output directory not found" -ForegroundColor Red
}

# Check for images directory
Write-Host "`nChecking project structure..." -ForegroundColor Yellow
if (!(Test-Path "images")) {
    Write-Host "! Creating images directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "images" -Force | Out-Null
    Write-Host "✓ Images directory created" -ForegroundColor Green
    Write-Host "  → Please add icon.png (128x128) to images/ directory" -ForegroundColor Cyan
} else {
    Write-Host "✓ Images directory exists" -ForegroundColor Green
    if (Test-Path "images/icon.png") {
        Write-Host "✓ Extension icon found" -ForegroundColor Green
    } else {
        Write-Host "! Icon not found: Please add icon.png (128x128) to images/" -ForegroundColor Yellow
    }
}

# Check documentation files
Write-Host "`nVerifying documentation..." -ForegroundColor Yellow
$docs = @(
    "README.md",
    "README.zh-CN.md",
    "IMPLEMENTATION.md",
    "IMPLEMENTATION.zh-CN.md",
    "TESTING-PUBLISHING.md",
    "TESTING-PUBLISHING.zh-CN.md",
    "CHANGELOG.md",
    "QUICKSTART.md",
    "COMPLETION-SUMMARY.md"
)

$missingDocs = @()
foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "✓ $doc" -ForegroundColor Green
    } else {
        Write-Host "✗ $doc (missing)" -ForegroundColor Red
        $missingDocs += $doc
    }
}

# Check language files
Write-Host "`nVerifying language files..." -ForegroundColor Yellow
if (Test-Path "package.nls.json") {
    Write-Host "✓ package.nls.json (English)" -ForegroundColor Green
} else {
    Write-Host "✗ package.nls.json (missing)" -ForegroundColor Red
}

if (Test-Path "package.nls.zh-cn.json") {
    Write-Host "✓ package.nls.zh-cn.json (Chinese)" -ForegroundColor Green
} else {
    Write-Host "✗ package.nls.zh-cn.json (missing)" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Create extension icon: images/icon.png (128x128)" -ForegroundColor White
Write-Host "2. Update package.json with your publisher name" -ForegroundColor White
Write-Host "3. Press F5 in VSCode to test the extension" -ForegroundColor White
Write-Host "4. Follow TESTING-PUBLISHING.md for complete guide" -ForegroundColor White

Write-Host "`nQuick Commands:" -ForegroundColor Yellow
Write-Host "  npm run compile  - Compile TypeScript" -ForegroundColor White
Write-Host "  npm run watch    - Watch mode compilation" -ForegroundColor White
Write-Host "  npm run lint     - Run ESLint" -ForegroundColor White
Write-Host "  npm run test     - Run tests" -ForegroundColor White
Write-Host "  F5 in VSCode     - Test extension" -ForegroundColor White

Write-Host "`nDocumentation:" -ForegroundColor Yellow
Write-Host "  User Guide:      README.md / README.zh-CN.md" -ForegroundColor White
Write-Host "  Implementation:  IMPLEMENTATION.md" -ForegroundColor White
Write-Host "  Testing Guide:   TESTING-PUBLISHING.md" -ForegroundColor White
Write-Host "  Quick Start:     QUICKSTART.md" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete! 🎉" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
