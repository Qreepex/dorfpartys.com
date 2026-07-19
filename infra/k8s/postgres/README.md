# Postgres-Betrieb

Konkrete Wahl des Betriebsmodells ist ein offener Punkt (AGENTS.md Abschnitt 10).
Diese Manifeste zeigen einen lauffähigen Ausgangspunkt über den
[CloudNativePG](https://cloudnative-pg.io/)-Operator, wie in AGENTS.md
Abschnitt 0 als Beispiel genannt.

## Voraussetzung

Operator im Cluster installieren (einmalig pro Cluster, nicht Teil dieses
Repos):

```bash
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/releases/cnpg-1.24.0.yaml
```

## Deployment

```bash
kubectl apply -f infra/k8s/namespace.yaml
cp infra/k8s/postgres/cluster.yaml infra/k8s/postgres/cluster.local.yaml
# Platzhalter-Passwort in cluster.local.yaml ersetzen, dann:
kubectl apply -f infra/k8s/postgres/cluster.local.yaml
```

Der Operator legt einen `postgres-rw`-Service (Read/Write, Primary) im
Namespace an — das ist der Host in `DATABASE_URL` für das Backend
(siehe `infra/k8s/backend/secret.example.yaml`).

## Nicht enthalten (bewusst außerhalb dieser Phase)

- Backup/PITR-Konfiguration (`spec.backup` im CNPG-Operator)
- Mehrere Instanzen/Failover-Topologie
- Connection Pooling (z.B. PgBouncer via CNPG `Pooler`)
