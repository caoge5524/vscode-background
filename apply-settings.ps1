# VSCode Background - Auto-Apply Script
# This script is automatically generated and executed

$ErrorActionPreference = "Stop"

$htmlPath = "d:\\Tools\\Microsoft VS Code\\bdd88df003\\resources\\app\\out\\vs\\code\\electron-browser\\workbench\\workbench.html"
$cssPath = "d:\\Tools\\Microsoft VS Code\\bdd88df003\\resources\\app\\out\\vs\\workbench\\workbench.desktop.main.css"
$videosDir = "d:\\Tools\\Microsoft VS Code\\bdd88df003\\resources\\app\\out\\vs\\code\\electron-browser\\workbench\\background-videos"
$productJsonPath = "d:\\Tools\\Microsoft VS Code\\bdd88df003\\resources\\app\\product.json"
$enabled = $true

Write-Host "VSCode Background - Applying Settings..." -ForegroundColor Cyan

# Create videos directory
if (-not (Test-Path $videosDir)) {
    New-Item -ItemType Directory -Path $videosDir -Force | Out-Null
}

# Copy video files
Write-Host "Copying 1 video file(s)..." -ForegroundColor Yellow
    Copy-Item -Path "d:\\Tools\\Steam\\steamapps\\workshop\\content\\431960\\3440522372\\rochelle.mp4" -Destination "$videosDir\\bg1.mp4" -Force

# Read and modify HTML
Write-Host "Modifying workbench.html..." -ForegroundColor Yellow
$html = Get-Content $htmlPath -Raw -Encoding UTF8

# Remove existing injection
$html = $html -replace "(?s)<!-- VSCODE-BACKGROUND-START -->.*?<!-- VSCODE-BACKGROUND-END -->", ""

# Add new injection
$injection = "<!-- VSCODE-BACKGROUND-START -->" + "\r\n
	<video id=\"bgVideo\" loop autoplay muted playsinline
		style=\"position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: 0.8;\">
	</video>

	<script>
		const VIDEO_BASENAME = 'bg';
		const VIDEO_EXT = 'mp4';
		const DISCOVERY_MAX = 100;
		const INFINITE_LOOP = false; // 无限循环模式

		let videoList = [];
		let currentIndex = 0;
		const videoElement = document.getElementById('bgVideo');
		const switchInterval = 60000;
		let timer = null;
		let switching = false;

		function sleep(ms) {
			return new Promise(resolve => setTimeout(resolve, ms));
		}

		async function ensureVideoPlaying({ retries = 3 } = {}) {
			for (let attempt = 0; attempt < retries; attempt++) {
				try {
					await videoElement.play();
				} catch (err) {
					// ignore and retry
				}

				if (!videoElement.paused) return true;
				await sleep(250 * (attempt + 1));
			}

			return !videoElement.paused;
		}

		async function mediaExists(src) {
			try {
				const headResp = await fetch(src, { method: 'HEAD', cache: 'no-store' });
				return headResp.ok;
			} catch (_) {
				// ignore
			}

			try {
				const resp = await fetch(src, {
					method: 'GET',
					cache: 'no-store',
					headers: { 'Range': 'bytes=0-0' }
				});
				return resp.ok;
			} catch (_) {
				return false;
			}
		}

		async function discoverVideosInFolder() {
			const discovered = [];
			for (let i = 1; i <= DISCOVERY_MAX; i++) {
				const src = ``./background-videos/`${VIDEO_BASENAME}`${i}.`${VIDEO_EXT}``;
				const exists = await mediaExists(src);
				if (!exists) break;
				discovered.push(src);
			}
			return discovered;
		}

		async function playVideoByIndex(index) {
			currentIndex = (index + videoList.length) % videoList.length;
			const src = videoList[currentIndex];

			try {
				videoElement.pause();
				videoElement.removeAttribute('src');
				videoElement.load();
			} catch (_) {
				// ignore
			}

			videoElement.muted = true;
			videoElement.volume = 0;
			videoElement.setAttribute('muted', '');

			videoElement.src = src;
			videoElement.load();

			const started = await ensureVideoPlaying({ retries: 3 });
			if (!started) {
				throw new Error('Failed to start video playback');
			}
		}

		async function initVideo() {
			videoList = await discoverVideosInFolder();
			if (!videoList.length) {
				console.error('No video files found');
				return;
			}

			try {
				await playVideoByIndex(0);
			} catch (err) {
				console.error('Failed to initialize video:', err);
				await switchToNextVideo();
			}
		}

		async function switchToNextVideo() {
			if (!videoList.length) return;
			if (switching) return;
			switching = true;

			try {
				const startIndex = currentIndex;
				for (let tries = 0; tries < videoList.length; tries++) {
					const nextIndex = (startIndex + 1 + tries) % videoList.length;
					try {
						await playVideoByIndex(nextIndex);
						return;
					} catch (err) {
						console.error('Failed to switch video:', err);
					}
				}
			} finally {
				switching = false;
			}
		}

		function startSwitchTimer() {
			if (INFINITE_LOOP) return; // 无限循环模式不启动定时器
			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				switchToNextVideo();
			}, switchInterval);
		}

		window.addEventListener('load', () => {
			initVideo();
			if (!INFINITE_LOOP) {
				startSwitchTimer();
			}
			console.log(INFINITE_LOOP ? 'Infinite loop mode - video will loop forever' : 'Switch timer started: ' + switchInterval + 'ms');
		});

		videoElement.addEventListener('error', (err) => {
			console.error('Video loading error:', err);
			switchToNextVideo();
		});

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				clearInterval(timer);
			} else {
				startSwitchTimer();
			}
		});
	</script>\r\n" + "<!-- VSCODE-BACKGROUND-END -->"
$html = $html -replace "(</body>)", "$injection`r`n`$1"

[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
Write-Host "HTML updated!" -ForegroundColor Green

# Modify CSS
Write-Host "Modifying CSS..." -ForegroundColor Yellow
$css = Get-Content $cssPath -Raw -Encoding UTF8

# Remove existing CSS
$css = $css -replace "(?s)/\* VSCODE-BACKGROUND-CSS-START \*/.*?/\* VSCODE-BACKGROUND-CSS-END \*/", ""

# Add new CSS
$cssInjection = "/* VSCODE-BACKGROUND-CSS-START */" + "\r\n
.monaco-workbench {
	background: transparent !important;
}
.monaco-workbench .part {
	background: transparent !important;
}
.monaco-workbench .editor-container {
	background: transparent !important;
}
.monaco-workbench .editor-instance {
	background: transparent !important;
}
body {
	background: rgba(30, 30, 30, 0.19999999999999996) !important;
}
\r\n" + "/* VSCODE-BACKGROUND-CSS-END */"
$css = $css + "`r`n" + $cssInjection

[System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)
Write-Host "CSS updated!" -ForegroundColor Green

Write-Host ""
Write-Host "Settings applied successfully!" -ForegroundColor Cyan
Write-Host "Please restart VSCode to see changes." -ForegroundColor Yellow