export interface Paginated<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface ApiErrorBody {
	error: {
		message: string;
		code: string;
		details?: unknown;
	};
}

export interface SitemapEventEntry {
	slug: string;
	updatedAt: string;
}

export interface SitemapTaxonomyEntry {
	loc: string;
}
