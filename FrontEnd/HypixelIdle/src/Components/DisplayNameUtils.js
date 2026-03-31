export const formatDisplayName = (value) => {
	if (value === null || value === undefined) {
		return '';
	}

	return String(value)
		.replaceAll('_', ' ')
		.replace(/\s+/g, ' ')
		.trim();
};
