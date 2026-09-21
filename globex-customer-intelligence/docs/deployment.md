# Deployment guide (Google Cloud)

This describes one workable production layout. **No cloud deployment has been performed for this
repository**; the steps below were written to be followed, not as a record of a completed deploy.

## Target layout

| Piece | Service | Why |
|---|---|---|
| Database | Cloud SQL for PostgreSQL 16 (private IP) | Managed backups, persistent storage |
| API | Cloud Run service built from `backend/Dockerfile` | Stateless, scales to zero |
| Web | Cloud Run service built from `frontend/Dockerfile` (nginx) | Serves the SPA and proxies `/api` to the API service |
| Jobs | Cloud Run Jobs using the backend image (`gci import-data`, `gci train`, `gci predict`) | Expensive work never runs behind a web request |
| Model store | Cloud Storage bucket mounted (or synced) at `/data/models`; MLflow file store in the same bucket or an MLflow server | Durable artifacts separate from containers |
| Secrets | Secret Manager (`DATABASE_URL`) | Never bake credentials into images |

## Steps

```bash
PROJECT=my-project REGION=europe-west2
gcloud config set project $PROJECT

# 1. Database
gcloud sql instances create gci-db --database-version=POSTGRES_16 --tier=db-g1-small --region=$REGION
gcloud sql databases create gci --instance=gci-db
gcloud sql users create gci --instance=gci-db --password="$(openssl rand -base64 24)"
# store the full SQLAlchemy URL in Secret Manager
echo -n "postgresql+psycopg://gci:<password>@/gci?host=/cloudsql/$PROJECT:$REGION:gci-db" | \
  gcloud secrets create gci-database-url --data-file=-

# 2. Images
gcloud artifacts repositories create gci --repository-format=docker --location=$REGION
gcloud builds submit backend  --tag $REGION-docker.pkg.dev/$PROJECT/gci/api:latest
gcloud builds submit frontend --tag $REGION-docker.pkg.dev/$PROJECT/gci/web:latest

# 3. Migrations + data + models as Cloud Run Jobs (same image, different commands)
gcloud run jobs create gci-migrate --image $REGION-docker.pkg.dev/$PROJECT/gci/api:latest \
  --region $REGION --add-cloudsql-instances $PROJECT:$REGION:gci-db \
  --set-secrets DATABASE_URL=gci-database-url:latest --command alembic --args upgrade,head
gcloud run jobs execute gci-migrate --wait
gcloud run jobs create gci-pipeline --image $REGION-docker.pkg.dev/$PROJECT/gci/api:latest \
  --region $REGION --add-cloudsql-instances $PROJECT:$REGION:gci-db \
  --set-secrets DATABASE_URL=gci-database-url:latest \
  --set-env-vars MODEL_STORE_DIR=/data/models,MLFLOW_TRACKING_URI=/data/mlruns \
  --add-volume name=models,type=cloud-storage,bucket=$PROJECT-gci-models \
  --add-volume-mount volume=models,mount-path=/data \
  --memory 4Gi --task-timeout 3600 \
  --command gci --args run-all,/data/raw/online_retail_II.xlsx
# upload the workbook to gs://$PROJECT-gci-models/raw/ first (gci download can also run in the job)
gcloud run jobs execute gci-pipeline --wait

# 4. API service (read-only, needs the same model volume for artifact metadata)
gcloud run deploy gci-api --image $REGION-docker.pkg.dev/$PROJECT/gci/api:latest --region $REGION \
  --add-cloudsql-instances $PROJECT:$REGION:gci-db --set-secrets DATABASE_URL=gci-database-url:latest \
  --set-env-vars CORS_ORIGINS=https://<web-url>,MODEL_STORE_DIR=/data/models \
  --add-volume name=models,type=cloud-storage,bucket=$PROJECT-gci-models \
  --add-volume-mount volume=models,mount-path=/data --allow-unauthenticated

# 5. Web service (nginx proxies /api to the API URL; set API_UPSTREAM at build or via nginx env)
gcloud run deploy gci-web --image $REGION-docker.pkg.dev/$PROJECT/gci/web:latest --region $REGION \
  --allow-unauthenticated
```

## Protecting write operations

The API exposes only `GET` endpoints. Imports, training and scoring are Cloud Run Jobs that require
IAM permission to execute. If you later add admin endpoints, keep `ENABLE_ADMIN_ENDPOINTS=false` in
public deployments and put them behind Identity-Aware Proxy.

## Demonstration data

Only the public UCI dataset (CC BY 4.0) is used. Keep the attribution visible in the UI footer and the
README when deploying publicly.

## Alternatives

The same containers run unchanged on AWS (App Runner or ECS + RDS + S3) or Azure (Container Apps +
Azure Database for PostgreSQL + Blob Storage). Replace the volume mount with an object-store sync step
in the job image if the platform cannot mount buckets.
