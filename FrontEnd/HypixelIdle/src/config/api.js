const DEFAULT_API_BASE = 'http://localhost:5091/api';

const resolvedApiBase = (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE)
	.toString()
	.trim()
	.replace(/\/+$/, '');

export const API_BASE = resolvedApiBase;
