<script lang="ts">
	import { resolve } from '$app/paths';

	const year = new Date().getFullYear();
</script>

<footer class="mt-16 border-t border-border">
	<div
		class="mx-auto flex max-w-240 flex-wrap justify-between gap-3 px-5 pt-8 pb-12 text-[0.85rem] text-muted"
	>
		<span>© {year} dorfpartys.com</span>
		<span>
			<a
				class="text-muted no-underline hover:text-primary"
				href="https://instagram.com/dorfpartys"
				target="_blank"
				rel="noopener noreferrer"
			>
				@dorfpartys
			</a>
		</span>
		<span class="flex flex-wrap gap-x-1.5">
			<a class="text-muted no-underline hover:text-primary" href={resolve('/faq')}>FAQ</a>
			·
			<a class="text-muted no-underline hover:text-primary" href={resolve('/impressum')}>Impressum</a>
			·
			<a class="text-muted no-underline hover:text-primary" href={resolve('/datenschutz')}>Datenschutz</a>
			·
			<a class="text-muted no-underline hover:text-primary" href={resolve('/nutzungsbedingungen')}>
				Nutzungsbedingungen
			</a>
		</span>
	</div>
</footer>
