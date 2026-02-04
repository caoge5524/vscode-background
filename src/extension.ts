import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface BackgroundConfig {
	enabled: boolean;
	videoFiles: string[];
	switchInterval: number;
	opacity: number;
}

let workbenchHtmlPath: string = '';
let workbenchCssPath: string = '';
let originalWorkbenchHtml: string = '';
let originalWorkbenchCss: string = '';

export function activate(context: vscode.ExtensionContext) {
	console.log('VSCode Background extension activated');

	// Locate workbench.html - try multiple possible paths
	const appRoot = vscode.env.appRoot;
	const possibleHtmlPaths = [
		path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
		path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
		path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.html'),
		path.join(appRoot, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
		path.join(appRoot, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html')
	];

	for (const possiblePath of possibleHtmlPaths) {
		if (fs.existsSync(possiblePath)) {
			workbenchHtmlPath = possiblePath;
			originalWorkbenchHtml = fs.readFileSync(workbenchHtmlPath, 'utf-8');
			console.log(`Found workbench.html at: ${workbenchHtmlPath}`);
			break;
		}
	}

	if (!workbenchHtmlPath) {
		console.error('Could not locate workbench.html. Checked paths:', possibleHtmlPaths);
	}

	// Locate workbench.desktop.main.css
	const possibleCssPaths = [
		path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'),
		path.join(appRoot, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css')
	];

	for (const possiblePath of possibleCssPaths) {
		if (fs.existsSync(possiblePath)) {
			workbenchCssPath = possiblePath;
			originalWorkbenchCss = fs.readFileSync(workbenchCssPath, 'utf-8');
			console.log(`Found workbench.desktop.main.css at: ${workbenchCssPath}`);
			break;
		}
	}

	if (!workbenchCssPath) {
		console.error('Could not locate workbench.desktop.main.css. Checked paths:', possibleCssPaths);
	}

	const enableBackground = vscode.commands.registerCommand('vscode-background.enable', async () => {
		try {
			const videoFiles = await selectVideoFiles();
			if (videoFiles && videoFiles.length > 0) {
				await applyVideoBackground(videoFiles);
				vscode.window.showInformationMessage('Video background enabled! Please restart VSCode to see changes.', 'Restart').then(selection => {
					if (selection === 'Restart') {
						vscode.commands.executeCommand('workbench.action.reloadWindow');
					}
				});
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to enable background: ${error}`);
		}
	});

	const disableBackground = vscode.commands.registerCommand('vscode-background.disable', async () => {
		try {
			await restoreOriginalWorkbench();
			vscode.window.showInformationMessage('Video background disabled! Please restart VSCode.', 'Restart').then(selection => {
				if (selection === 'Restart') {
					vscode.commands.executeCommand('workbench.action.reloadWindow');
				}
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to disable background: ${error}`);
		}
	});

	const configureBackground = vscode.commands.registerCommand('vscode-background.configure', async () => {
		const config = vscode.workspace.getConfiguration('vscodeBackground');
		const currentFiles = config.get<string[]>('videoFiles', []);

		vscode.window.showInformationMessage(`Current video files: ${currentFiles.length > 0 ? currentFiles.join(', ') : 'None'}`, 'Select Videos', 'Cancel').then(selection => {
			if (selection === 'Select Videos') {
				vscode.commands.executeCommand('vscode-background.enable');
			}
		});
	});

	const diagnostics = vscode.commands.registerCommand('vscode-background.diagnostics', async () => {
		const appRoot = vscode.env.appRoot;
		const possibleHtmlPaths = [
			path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
			path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
			path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.html'),
			path.join(appRoot, 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
			path.join(appRoot, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html')
		];

		const possibleCssPaths = [
			path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.css'),
			path.join(appRoot, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.css')
		];

		let diagnosticInfo = `VSCode Background - Diagnostics\n\n`;
		diagnosticInfo += `VSCode Version: ${vscode.version}\n`;
		diagnosticInfo += `App Root: ${appRoot}\n\n`;
		diagnosticInfo += `Current Workbench HTML Path: ${workbenchHtmlPath || 'Not found'}\n`;
		diagnosticInfo += `Current Workbench CSS Path: ${workbenchCssPath || 'Not found'}\n\n`;

		diagnosticInfo += `Checked HTML Paths:\n`;
		for (const p of possibleHtmlPaths) {
			const exists = fs.existsSync(p);
			diagnosticInfo += `${exists ? '✓' : '✗'} ${p}\n`;
		}

		diagnosticInfo += `\nChecked CSS Paths:\n`;
		for (const p of possibleCssPaths) {
			const exists = fs.existsSync(p);
			diagnosticInfo += `${exists ? '✓' : '✗'} ${p}\n`;
		}

		// Create output channel to show diagnostics
		const outputChannel = vscode.window.createOutputChannel('VSCode Background Diagnostics');
		outputChannel.clear();
		outputChannel.appendLine(diagnosticInfo);
		outputChannel.show();

		vscode.window.showInformationMessage('Diagnostics information shown in output panel');
	});

	context.subscriptions.push(enableBackground, disableBackground, configureBackground, diagnostics);
}

async function selectVideoFiles(): Promise<string[] | undefined> {
	const options: vscode.OpenDialogOptions = {
		canSelectMany: true,
		openLabel: 'Select Video Files',
		filters: {
			'Video Files': ['mp4', 'webm', 'ogg'],
			'All Files': ['*']
		}
	};

	const fileUris = await vscode.window.showOpenDialog(options);
	if (fileUris && fileUris.length > 0) {
		return fileUris.map(uri => uri.fsPath);
	}
	return undefined;
}

async function applyVideoBackground(videoFiles: string[]): Promise<void> {
	console.log('=== applyVideoBackground START ===');
	console.log('Video files:', videoFiles);
	console.log('Workbench HTML path:', workbenchHtmlPath);
	console.log('Workbench CSS path:', workbenchCssPath);

	if (!workbenchHtmlPath || !fs.existsSync(workbenchHtmlPath)) {
		const appRoot = vscode.env.appRoot;
		const errorMsg = `Workbench HTML file not found.\n\nVSCode Root: ${appRoot}\n\nPlease report this issue with your VSCode version.`;

		// Show detailed error with option to see diagnostic info
		const action = await vscode.window.showErrorMessage(
			'Cannot locate workbench.html file',
			'Show Details',
			'Cancel'
		);

		if (action === 'Show Details') {
			vscode.window.showInformationMessage(errorMsg, { modal: true });
		}

		throw new Error('Workbench HTML file not found');
	}

	const config = vscode.workspace.getConfiguration('vscodeBackground');
	const switchInterval = config.get<number>('switchInterval', 180000);
	const opacity = config.get<number>('opacity', 0.3);

	console.log('Config - switchInterval:', switchInterval, 'opacity:', opacity);

	// Copy videos to a local directory
	const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
	console.log('Video directory path:', videoDirPath);

	if (!fs.existsSync(videoDirPath)) {
		fs.mkdirSync(videoDirPath, { recursive: true });
		console.log('Created video directory');
	}

	// Copy and rename videos to bg1.mp4, bg2.mp4, etc.
	for (let i = 0; i < videoFiles.length; i++) {
		const sourcePath = videoFiles[i];
		const ext = path.extname(sourcePath);
		const destPath = path.join(videoDirPath, `bg${i + 1}${ext}`);
		fs.copyFileSync(sourcePath, destPath);
		console.log(`Copied video ${i + 1}: ${sourcePath} -> ${destPath}`);
	}

	// Read fresh HTML (not cached version)
	let workbenchHtml = fs.readFileSync(workbenchHtmlPath, 'utf-8');
	console.log('Original HTML length:', workbenchHtml.length);

	// Remove any existing video background injection
	const bgMarkerStart = '<!-- VSCODE-BACKGROUND-START -->';
	const bgMarkerEnd = '<!-- VSCODE-BACKGROUND-END -->';

	if (workbenchHtml.includes(bgMarkerStart)) {
		console.log('Removing existing background injection...');
		const regex = new RegExp(`${bgMarkerStart}[\\s\\S]*?${bgMarkerEnd}`, 'g');
		workbenchHtml = workbenchHtml.replace(regex, '');
		console.log('Removed existing injection, new length:', workbenchHtml.length);
	}

	const videoScript = generateVideoScript(switchInterval, opacity);
	console.log('Generated video script length:', videoScript.length);

	// Modify CSP to allow inline scripts (required for video background script)
	if (workbenchHtml.includes("script-src")) {
		// Add 'unsafe-inline' to script-src if not already present
		if (!workbenchHtml.includes("'unsafe-inline'")) {
			workbenchHtml = workbenchHtml.replace(
				/script-src\s*\n\s*'self'/,
				"script-src\n\t\t\t\t\t'self'\n\t\t\t\t\t'unsafe-inline'"
			);
			console.log('Added unsafe-inline to CSP script-src');
		}
	}

	if (workbenchHtml.includes('<body')) {
		const before = workbenchHtml.length;
		workbenchHtml = workbenchHtml.replace(/<body([^>]*)>/, `<body$1>\n${bgMarkerStart}\n${videoScript}\n${bgMarkerEnd}`);
		console.log('HTML modified, length change:', workbenchHtml.length - before);
	} else {
		console.error('ERROR: No <body tag found in HTML!');
	}

	fs.writeFileSync(workbenchHtmlPath, workbenchHtml, 'utf-8');
	console.log('Wrote modified HTML to:', workbenchHtmlPath);

	// Modify CSS to make workbench transparent
	if (workbenchCssPath && fs.existsSync(workbenchCssPath)) {
		let workbenchCss = originalWorkbenchCss || fs.readFileSync(workbenchCssPath, 'utf-8');
		console.log('Original CSS length:', workbenchCss.length);

		// Remove any existing opacity rules
		workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension - START \*\/[\s\S]*?\/\* VSCode Background Extension - END \*\/\n?/g, '');
		// Also remove old format
		workbenchCss = workbenchCss.replace(/\/\* VSCode Background Extension \*\/[\s\S]*?\.monaco-workbench[^}]*\}[^/]*\.monaco-workbench > \.part[^}]*\}\n?/g, '');

		// Add comprehensive transparency rules for video background visibility
		const opacityRule = `
			/* VSCode Background Extension - START */
			html, body {
				background: transparent !important;
			}
			.monaco-workbench {
				background: transparent !important;
				background-color: transparent !important;
			}
			.monaco-workbench > .part {
				background: transparent !important;
				background-color: rgba(30, 30, 30, ${opacity}) !important;
			}
			.monaco-workbench .part.editor > .content {
				background: transparent !important;
			}
			.monaco-workbench .editor-group-container {
				background: transparent !important;
			}
			.monaco-workbench .split-view-view {
				background: transparent !important;
			}
			.monaco-editor, .monaco-editor-background {
				background: transparent !important;
				background-color: rgba(30, 30, 30, ${opacity}) !important;
			}
			.monaco-editor .margin {
				background: transparent !important;
			}
			.monaco-editor .monaco-editor-background {
				background: transparent !important;
			}
			/* VSCode Background Extension - END */
			`;
		workbenchCss += opacityRule;

		fs.writeFileSync(workbenchCssPath, workbenchCss, 'utf-8');
		console.log(`Applied CSS transparency rules to ${workbenchCssPath}`);
		console.log('CSS rule added:', opacityRule.trim());
	} else {
		console.warn('Could not locate workbench CSS file, opacity may not work correctly');
	}

	// Save configuration
	await config.update('videoFiles', videoFiles, vscode.ConfigurationTarget.Global);

	console.log('=== applyVideoBackground COMPLETE ===');
}

function generateVideoScript(switchInterval: number, opacity: number): string {
	return `
	<video id="bgVideo" loop autoplay muted playsinline
		style="position: fixed; inset: 0; width: 100vw; height: 100vh; object-fit: cover; object-position: center; z-index: -100; opacity: ${opacity};">
	</video>

	<script>
		const VIDEO_BASENAME = 'bg';
		const VIDEO_EXT = 'mp4';
		const DISCOVERY_MAX = 100;

		let videoList = [];
		let currentIndex = 0;
		const videoElement = document.getElementById('bgVideo');
		const switchInterval = ${switchInterval};
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
				const src = \`./background-videos/\${VIDEO_BASENAME}\${i}.\${VIDEO_EXT}\`;
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
			if (timer) clearInterval(timer);
			timer = setInterval(() => {
				switchToNextVideo();
			}, switchInterval);
		}

		window.addEventListener('load', () => {
			initVideo();
			startSwitchTimer();
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
	</script>`;
}

async function restoreOriginalWorkbench(): Promise<void> {
	// Read current HTML and remove injection
	let workbenchHtml = fs.readFileSync(workbenchHtmlPath, 'utf-8');

	const bgMarkerStart = '<!-- VSCODE-BACKGROUND-START -->';
	const bgMarkerEnd = '<!-- VSCODE-BACKGROUND-END -->';

	if (workbenchHtml.includes(bgMarkerStart)) {
		console.log('Removing background injection...');
		const regex = new RegExp(`${bgMarkerStart}[\\s\\S]*?${bgMarkerEnd}\\n?`, 'g');
		workbenchHtml = workbenchHtml.replace(regex, '');
		fs.writeFileSync(workbenchHtmlPath, workbenchHtml, 'utf-8');
		console.log('Removed background injection from HTML');
	}

	// Restore CSS
	if (originalWorkbenchCss && workbenchCssPath) {
		fs.writeFileSync(workbenchCssPath, originalWorkbenchCss, 'utf-8');
		console.log('Restored original CSS');
	}

	// Clean up video files
	const videoDirPath = path.join(path.dirname(workbenchHtmlPath), 'background-videos');
	if (fs.existsSync(videoDirPath)) {
		fs.rmSync(videoDirPath, { recursive: true, force: true });
		console.log('Cleaned up video directory');
	}
}

export function deactivate() {
	// Optionally restore on deactivation
}
