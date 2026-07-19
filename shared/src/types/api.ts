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

export interface StatsResponse {
	totalEvents: number;
	upcomingEvents: number;
	totalStates: number;
	totalCities: number;
	byCategory: Array<{ category: string; count: number }>;
	byState: Array<{ state: string; count: number }>;
}

export interface SearchTreeNode {
	state: string;
	cities: Array<{
		city: string;
		categories: string[];
	}>;
}

export interface SitemapEventEntry {
	slug: string;
	updatedAt: string;
}
