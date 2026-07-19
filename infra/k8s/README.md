# infra/k8s

Manifeste für ein eigenes Kubernetes-Cluster (AGENTS.md Abschnitt 8). Nicht
production-ready, aber lokal/staging deploybar (AGENTS.md Abschnitt 9).

## Reihenfolge

```bash
kubectl apply -f namespace.yaml

# Secrets: *.example.yaml kopieren -> secret.yaml, echte Werte eintragen,
# dann anwenden (secret.yaml ist gitignored)
cp backend/secret.example.yaml backend/secret.yaml
cp frontend/secret.example.yaml frontend/secret.yaml
kubectl apply -f backend/configmap.yaml -f backend/secret.yaml
kubectl apply -f frontend/configmap.yaml -f frontend/secret.yaml

kubectl apply -f backend/deployment.yaml -f backend/service.yaml
kubectl apply -f frontend/deployment.yaml -f frontend/service.yaml

kubectl apply -f ingress/ingress.yaml
```

## Images

Gebaut aus `infra/docker/backend/Dockerfile` und `infra/docker/frontend/Dockerfile`
mit dem Repo-Root als Build-Kontext (Monorepo/pnpm-Workspace):

```bash
docker build -f infra/docker/backend/Dockerfile -t registry.dorfpartys.com/dorfpartys/backend:latest .
docker build -f infra/docker/frontend/Dockerfile -t registry.dorfpartys.com/dorfpartys/frontend:latest .
```

`registry.dorfpartys.com/...` ist ein Platzhalter — CI-Pipeline und tatsächliche
Registry sind kein Teil dieser Phase.

## Nicht enthalten

- HorizontalPodAutoscaler, PodDisruptionBudget
- NetworkPolicies
- CI/CD (Image-Build/Push, Rollout-Trigger)
