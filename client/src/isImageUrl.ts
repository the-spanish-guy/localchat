const IMAGE_EXTENSIONS = [
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".avif",
	".bmp",
	".svg",
];

export function isImageUrl(url: string): boolean {
	try {
		const { pathname } = new URL(url);
		const lower = pathname.toLowerCase();
		return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
	} catch {
		return false;
	}
}
