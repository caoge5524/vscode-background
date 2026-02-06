# VSCode Background - Auto-Apply Script
# This script is automatically generated and executed

$ErrorActionPreference = "Stop"

$htmlPath = 'd:\Tools\Microsoft VS Code\bdd88df003\resources\app\out\vs\code\electron-browser\workbench\workbench.html'
$cssPath = 'd:\Tools\Microsoft VS Code\bdd88df003\resources\app\out\vs\workbench\workbench.desktop.main.css'
$videosDir = 'd:\Tools\Microsoft VS Code\bdd88df003\resources\app\out\vs\code\electron-browser\workbench\background-videos'
$productJsonPath = 'd:\Tools\Microsoft VS Code\bdd88df003\resources\app\product.json'
$enabled = $true

Write-Host "VSCode Background - Applying Settings..." -ForegroundColor Cyan

# Create videos directory
if (-not (Test-Path $videosDir)) {
    New-Item -ItemType Directory -Path $videosDir -Force | Out-Null
}

# Process HTML file
Write-Host "Processing workbench.html..." -ForegroundColor Yellow
$html = Get-Content $htmlPath -Raw -Encoding UTF8

# Remove ALL existing injections (old and new formats)
$html = $html -replace "(?s)<!-- VSCODE-BACKGROUND-START -->.*?<!-- VSCODE-BACKGROUND-END -->", ""
$html = $html -replace "(?s)<!-- VSCode Background.*?-->", ""
# Remove orphaned brackets
$html = $html -replace "(?m)^\s*\[\]\s*$", ""
$html = $html -replace "(?m)^\s*\[\s*$", ""
$html = $html -replace "(?m)^\s*\]\s*$", ""

# Add injection to HTML
$videoScript = @"

	<video id="bgVideo" muted playsinline
		style="position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: 0.8;">
	</video>
	<script>
		const bgVideo = document.getElementById('bgVideo') || (() => {
			const v = document.createElement('video');
			v.id = 'bgVideo';
			v.muted = true;
			v.playsinline = true;
			v.style.cssText = 'position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: 0.8;';
			document.body.appendChild(v);
			return v;
		})();
		let currentIndex = 1;
		let maxIndex = 1;
		const switchInterval = 10000;
		async function findVideos() {
			for (let i = 2; i <= 100; i++) {
				try {
					const response = await fetch('./background-videos/bg' + i + '.mp4', { method: 'HEAD' });
					if (!response.ok) break;
					maxIndex = i;
				} catch (_) {
					break;
				}
			}
		}
		function playVideo(index) {
			bgVideo.setAttribute('loop', 'loop');
			bgVideo.setAttribute('autoplay', 'autoplay');
			bgVideo.src = './background-videos/bg' + index + '.mp4';
			bgVideo.load();
			bgVideo.play().catch(e => console.warn('Play failed:', e));
		}
		async function switchVideo() {
			if (maxIndex <= 1) return;
			currentIndex = currentIndex % maxIndex + 1;
			playVideo(currentIndex);
		}
		async function init() {
			await findVideos();
			if (maxIndex >= 1) {
				playVideo(1);
				if (switchInterval > 0) {
					setInterval(switchVideo, switchInterval);
				}
			}
		}
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', init);
		} else {
			init();
		}
	</script>
"@

$injection = "<!-- VSCODE-BACKGROUND-START -->" + [System.Environment]::NewLine + $videoScript + [System.Environment]::NewLine + "<!-- VSCODE-BACKGROUND-END -->"
$html = $html -replace "(<body[^>]*>)", "`$1`r`n$injection"
Write-Host "HTML injection added" -ForegroundColor Green

[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)

# Process CSS file
Write-Host "Processing CSS..." -ForegroundColor Yellow
$css = Get-Content $cssPath -Raw -Encoding UTF8

# Remove ALL existing CSS injections (old and new formats)
$css = $css -replace "(?s)/\* VSCODE-BACKGROUND-CSS-START \*/.*?/\* VSCODE-BACKGROUND-CSS-END \*/", ""
$css = $css -replace "(?s)/\* VSCode Background Extension - START \*/.*?/\* VSCode Background Extension - END \*/", ""

# Add CSS injection
$cssRules = @"

.monaco-workbench {
	opacity: 0.8 !important;
}

"@

$cssInjection = "/* VSCODE-BACKGROUND-CSS-START */" + [System.Environment]::NewLine + $cssRules + [System.Environment]::NewLine + "/* VSCODE-BACKGROUND-CSS-END */"
$css = $css + "`r`n" + $cssInjection
Write-Host "CSS injection added" -ForegroundColor Green

[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "Settings applied successfully!" -ForegroundColor Cyan
Write-Host "Please restart VSCode to see changes." -ForegroundColor Yellow