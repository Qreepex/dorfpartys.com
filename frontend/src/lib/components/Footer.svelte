<script lang="ts">
	import { resolve } from '$app/paths';

	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-inner">
		<span>© {year} dorfpartys.com</span>
		<span>
			<a href="https://instagram.com/dorfpartys" target="_blank" rel="noopener noreferrer">
				@dorfpartys
			</a>
		</span>
		<span>
			<a href={resolve('/impressum')}>Impressum</a> ·
			<a href={resolve('/datenschutz')}>Datenschutz</a>
		</span>
	</div>
</footer>

<style>
	.footer {
		border-top: 1px solid var(--color-border);
		margin-top: 64px;
	}

	.footer-inner {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: space-between;
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.footer-inner a {
		color: var(--color-muted);
		text-decoration: none;
	}

	.footer-inner a:hover {
		color: var(--color-primary);
	}
</style>
