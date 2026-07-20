<script lang="ts">
	import { resolve } from '$app/paths';
	import { LinkTypeIcon } from '$lib/components/index.js';

	const year = new Date().getFullYear();
</script>

<footer class="mt-16 border-t border-border">
	<div class="mx-auto max-w-240 px-5 pt-8 pb-12 text-[0.85rem] text-muted">
		<div class="flex flex-wrap justify-between gap-3">
			<span>© {year} dorfpartys.com</span>
			<span class="flex flex-wrap gap-x-1.5">
				<a class="text-muted no-underline hover:text-primary" href={resolve('/faq')}>FAQ</a>
				·
				<a class="text-muted no-underline hover:text-primary" href={resolve('/impressum')}
					>Impressum</a
				>
				·
				<a class="text-muted no-underline hover:text-primary" href={resolve('/datenschutz')}
					>Datenschutz</a
				>
				·
				<a
					class="text-muted no-underline hover:text-primary"
					href={resolve('/nutzungsbedingungen')}
				>
					Nutzungsbedingungen
				</a>
				·
				<a class="text-muted no-underline hover:text-primary" href={resolve('/report')}>
					Inhalte melden
				</a>
			</span>
		</div>
		<div class="mt-4 flex items-center gap-3 text-base">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externes Social-Media-Profil, kein interner Route -->
			<a
				class="inline-flex items-center text-muted no-underline transition-transform duration-150 hover:scale-110 hover:text-primary"
				href="https://www.tiktok.com/@dorfpartys"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="dorfpartys.com auf TikTok"
			>
				<LinkTypeIcon type="tiktok" />
			</a>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- externes Social-Media-Profil, kein interner Route -->
			<a
				class="inline-flex items-center text-muted no-underline transition-transform duration-150 hover:scale-110 hover:text-primary"
				href="https://www.instagram.com/dorfpartys"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="dorfpartys.com auf Instagram"
			>
				<LinkTypeIcon type="instagram" />
			</a>
		</div>
	</div>
</footer>
