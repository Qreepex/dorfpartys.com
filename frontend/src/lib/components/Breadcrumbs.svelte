<script lang="ts">
	interface Crumb {
		name: string;
		href: string;
	}

	interface Props {
		items: Crumb[];
	}

	let { items }: Props = $props();
</script>

<nav class="text-[0.8rem] text-muted" aria-label="Breadcrumb">
	{#each items as crumb, i (crumb.href)}
		{#if i > 0}<span class="mx-1.5">/</span>{/if}
		{#if i === items.length - 1}
			<span aria-current="page">{crumb.name}</span>
		{:else}
			<a class="text-muted no-underline hover:text-primary" href={crumb.href}>{crumb.name}</a>
		{/if}
	{/each}
</nav>
