# OG-Image-Generator für Search-Routen

Generiert automatisch Social-Media-Preview-Bilder für alle gültigen Filter-Kombinationen (Bundesland × Kreis × Party-Art × Monat).

## Nutzung

### Test-Modus (nur 1 Bild generieren)
```bash
pnpm --filter backend generate-og-images:test
```

Dies generiert ein einzelnes Test-Bild zum Anpassen von Farben, Schriftgrößen, Layout etc.

### Produktions-Modus (alle Bilder generieren)
```bash
pnpm --filter backend generate-og-images
```

Generiert OG-Images für alle Kombinationen (kann mehrere Minuten dauern).

## Konfiguration

Folgende Umgebungsvariablen (aus `.env`):
- `S3_BUCKET` - S3-Bucket-Name (default: `dorfpartys`)
- `S3_ENDPOINT` - S3-Endpoint (default: `https://speicher.dorfpartys.com`)
- `S3_REGION` - AWS-Region (default: `eu-1`)
- `S3_ACCESS_KEY` - S3-Access-Key
- `S3_SECRET_KEY` - S3-Secret-Key

## Technische Details

### Generierung
- Erzeugt SVG-basierte OG-Images (1200×630px, Standard für Social Media)
- Nutzt **sharp** für SVG → PNG-Konvertierung
- Bilder werden als PNG mit Gzip-Kompression gespeichert

### Ablage
- S3-Pfad: `og-images/{slug}.png`
- Cache-Control: `public, max-age=31536000, immutable` (1 Jahr, immutable)
- Öffentliche URL: `https://speicher.dorfpartys.com/og-images/{slug}.png`

### Customization
Im Script können folgende Aspekte angepasst werden:
- **Farben**: `primaryColor`-Parameter in `generateOgImage()`
- **Layout**: SVG-Struktur in der `svg`-Variable
- **Schriftgrößen**: `font-size`-Attribute in den SVG-Text-Elementen
- **Inhalte**: `title` und `subtitle` Parameter

### Integration mit Frontend

Um die OG-Images in den Search-Seiten zu nutzen:

1. **In `backend/src/resolver/resolve.ts`** die `ResolveResult` um `ogImageUrl` erweitern:
   ```typescript
   export interface ResolveResult {
     filters: Filters;
     results: EventSummary[];
     indexable: boolean;
     seoText: SeoText;
     ogImageUrl?: string;  // Neue Feld
   }
   ```

2. **Mapping-Logik**: Basierend auf den gesammelten Filters → entsprechende OG-Image-URL
   ```typescript
   const slugs = [
     filters.bundesland,
     filters.kreis,
     filters.art,
     filters.monat
   ].filter(Boolean).join('-');
   
   result.ogImageUrl = slugs 
     ? `https://speicher.dorfpartys.com/og-images/og-image-${slugs}-${country}.png`
     : undefined;
   ```

3. **Im Frontend `+page.server.ts`** die `ogImageUrl` vom Resolver nutzen:
   ```typescript
   const resolved = await backend.resolve({ country, segments });
   
   return {
     ...resolved,
     ogImageUrl: resolved.ogImageUrl
   };
   ```

4. **In der Svelte-Seite** die Meta-Tag rendern:
   ```svelte
   {#if data.ogImageUrl}
     <meta property="og:image" content={data.ogImageUrl} />
     <meta property="og:image:width" content="1200" />
     <meta property="og:image:height" content="630" />
   {/if}
   ```

## Beispiel-Ausführung

```bash
$ pnpm --filter backend generate-og-images:test

🧪 TEST MODE: Generiere nur 1 OG-Image zum Testen
📸 Generiere: Schützenfeste...
   ✅ Erfolgreich hochgeladen: https://speicher.dorfpartys.com/og-images/og-image-schuetzenfeste-de.png

📊 Zusammenfassung:
   ✅ Erfolgreich: 1
   ❌ Fehler: 0

ℹ️  Nutze diese URLs in den Meta-Tags der Filter-Seiten
```

## Troubleshooting

**S3-Upload schlägt fehl:**
- `.env`-Datei prüfen (S3-Credentials vorhanden?)
- S3-Bucket-Permissions prüfen (PutObject-Permission?)
- S3-Endpoint erreichbar? (`curl https://speicher.dorfpartys.com`)

**SVG-zu-PNG-Konvertierung schlägt fehl:**
- `sharp` Installation prüfen: `npm ls sharp`
- System-Abhängigkeiten: `libvips` muss installiert sein

## Performance

- **Test-Modus**: ~500ms pro Bild
- **Produktions-Modus**: Abhängig von Kombinationen (typisch 5-10 Minuten für ~1000 Kombinationen)
- S3-Upload-Zeit: ~100-200ms pro Bild (abhängig von Netzwerk-Latenz)

## Automation

Für regelmäßige Regenerierung (z.B. bei neuen Partys-Kategorien hinzufügen):
1. Script in CI/CD integrieren (GitHub Actions, etc.)
2. Cron-Job auf dem Server ausführen (z.B. `0 2 * * 0` für Sonntag 2 Uhr)
3. Manuell bei Bedarf über CLI aufrufen
