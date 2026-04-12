import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as skinview3d from 'skinview3d';
import { API_BASE } from '../config/api';
import '../Styles/PlayerSkinRenderStyles.css';

const DEFAULT_USERNAME = 'MisterShaco';

const normalizeUsername = (username) => (username ?? '').trim();

const PlayerSkinRender = forwardRef(function PlayerSkinRender({ initialUsername = '' }, ref) {
	const canvasRef = useRef(null);
	const viewerRef = useRef(null);
	const resizeObserverRef = useRef(null);
	const storedUsername = normalizeUsername(localStorage.getItem('username'));
	const seededUsername = normalizeUsername(initialUsername) || storedUsername || DEFAULT_USERNAME;

	const [inputUsername, setInputUsername] = useState(seededUsername);
	const [activeUsername, setActiveUsername] = useState(seededUsername);
	const [resolvedUuid, setResolvedUuid] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useImperativeHandle(ref, () => ({
		renderUsername: (username) => {
			const normalized = normalizeUsername(username);
			if (!normalized) {
				return;
			}

			setInputUsername(normalized);
			setActiveUsername(normalized);
		},
	}));

	const staticFallbackUrl = useMemo(
		() => (resolvedUuid ? `https://nmsr.nickac.dev/fullbody/${resolvedUuid}?no=shadow` : ''),
		[resolvedUuid]
	);

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) {
			return undefined;
		}

		const viewer = new skinview3d.SkinViewer({
			canvas,
			width: 500,
			height: 900,
			animation: new skinview3d.IdleAnimation(),
			preserveDrawingBuffer: true,
			alpha: true,
		});

		viewer.camera.position.set(-18, -3, 78);
		viewer.controls.enableZoom = false;
		viewer.controls.enablePan = true;
		viewer.controls.enableRotate = true;
		viewer.canvas.removeAttribute('tabindex');

		viewerRef.current = viewer;

		const resizeViewer = () => {
			const parent = canvas.parentElement;
			if (!parent || !viewerRef.current) {
				return;
			}

			viewerRef.current.setSize(parent.clientWidth, parent.clientHeight);
		};

		resizeObserverRef.current = new ResizeObserver(() => resizeViewer());
		resizeObserverRef.current.observe(canvas.parentElement);
		resizeViewer();

		return () => {
			resizeObserverRef.current?.disconnect();
			viewer.dispose();
			viewerRef.current = null;
		};
	}, []);

	useEffect(() => {
		const normalized = normalizeUsername(initialUsername);
		if (!normalized) {
			return;
		}

		setInputUsername(normalized);
		setActiveUsername(normalized);
	}, [initialUsername]);

	useEffect(() => {
		let isCancelled = false;

		const loadSkinFromUsername = async () => {
			const normalizedUsername = activeUsername.trim();

			if (!normalizedUsername) {
				setError('Please provide a Minecraft username.');
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError('');

			try {
				const resolveResponse = await fetch(
					`${API_BASE}/Skin/Resolve?username=${encodeURIComponent(normalizedUsername)}`
				);

				if (!resolveResponse.ok) {
					throw new Error('Could not resolve skin from backend skin API.');
				}

				const resolvedSkin = await resolveResponse.json();
				const uuid = resolvedSkin?.uuid ?? resolvedSkin?.Uuid;
				const skinUrl = resolvedSkin?.skinUrl ?? resolvedSkin?.SkinUrl;
				const capeUrl = resolvedSkin?.capeUrl ?? resolvedSkin?.CapeUrl;

				if (!uuid) {
					throw new Error('Could not resolve UUID from username.');
				}

				if (!skinUrl) {
					throw new Error('Could not resolve skin URL from backend API.');
				}

				if (isCancelled) {
					return;
				}

				setResolvedUuid(uuid);

				if (!viewerRef.current) {
					throw new Error('Skin viewer is not ready yet.');
				}

				await viewerRef.current.loadSkin(skinUrl);

				if (capeUrl) {
					await viewerRef.current.loadCape(capeUrl);
				} else {
					viewerRef.current.resetCape();
				}

				if (!isCancelled) {
					setIsLoading(false);
				}
			} catch (loadError) {
				console.error('Failed to render player skin:', loadError);
				if (!isCancelled) {
					setError(loadError instanceof Error ? loadError.message : 'Failed to render skin.');
					setIsLoading(false);
				}
			}
		};

		loadSkinFromUsername();

		return () => {
			isCancelled = true;
		};
	}, [activeUsername]);

	const onSubmit = (event) => {
		event.preventDefault();
		const normalized = normalizeUsername(inputUsername);
		if (!normalized) {
			return;
		}

		setInputUsername(normalized);
		setActiveUsername(normalized);
	};

	return (
		<section className="player-skin-render-page">
			<header className="player-skin-render-header">
				<h1>Player Skin Render</h1>
				
			</header>

			<form className="player-skin-render-form" onSubmit={onSubmit}>
				<label htmlFor="skin-username">Minecraft Username</label>
				<input
					id="skin-username"
					type="text"
					value={inputUsername}
					onChange={(event) => setInputUsername(event.target.value)}
					placeholder="Enter username"
					autoComplete="off"
				/>
				<button type="submit">Render Skin</button>
			</form>

			<article className="player-skin-render-card">
				<div
					className="size-full transform-gpu overflow-hidden opacity-0 data-[loading=false]:motion-preset-focus data-[loading=false]:motion-preset-slide-right data-[loading=false]:opacity-100 h-full player-skin-render-canvas-wrap"
					data-loading={isLoading}
				>
					<canvas
						ref={canvasRef}
						className="player-skin-render-canvas"
						data-loading={isLoading}
					/>
					{isLoading ? <div className="player-skin-render-overlay">Loading skin...</div> : null}
				</div>

				<aside className="player-skin-render-meta">
					<p><strong>Username:</strong> {activeUsername}</p>
					<p><strong>UUID:</strong> {resolvedUuid || 'Resolving...'}</p>
					{error ? <p className="player-skin-render-error">{error}</p> : null}
					{error && staticFallbackUrl ? (
						<img
							className="player-skin-render-fallback"
							src={staticFallbackUrl}
							alt={`${activeUsername} static avatar fallback`}
						/>
					) : null}
				</aside>
			</article>
		</section>
	);
});

export default PlayerSkinRender;
