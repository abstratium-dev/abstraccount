# Building Native Image with Docker and Mandrel

This document describes how to build the component as a native executable using Docker with Mandrel, without requiring GraalVM or Mandrel to be installed on your local Ubuntu system.

Commit everything to git.

```bash
./build-docker-image.sh
```

This script will:
1. Build the native executable using Maven with container build
2. Extract the build version from `application.properties`
3. Build the Docker image with both version-specific and `latest` tags

Then run the container (make sure to source your env file first: `source /w/abstratium-abstraccount.env`) as shown below, in order to test it. For a production deployment, see [../USER_GUIDE.md](USER_GUIDE.md).

Sourcing the env file only makes the variables available in your local shell; any variable the container needs must also be forwarded with `-e`.

Partner data is loaded from CSV files in `partner.data.dir` (one file per organisation, named `<orgId>.csv`). The default `partner.data.dir` is `data/partners`, which maps to `/work/data/partners` inside the container. For local e2e testing you must mount your host `.ant/partners` directory into that path, and the CSV file must be named after `DEFAULT_ORG_UUID` (e.g. if `DEFAULT_ORG_UUID` is `058ebe1e-e9c8-4359-ab77-e943990ab0dd`, the file must be `.ant/partners/058ebe1e-e9c8-4359-ab77-e943990ab0dd.csv`).

Note: The `latest` tag always refers to the most recently built and pushed image. You can also use a specific version tag (e.g., `ghcr.io/abstratium-dev/abstraccount:20251223212503`).

```bash
docker run -it --rm \
  -p 127.0.0.1:8083:8083 \
  -p 127.0.0.1:9005:9005 \
  --network abstratium \
  --name abstratium-abstraccount \
  -v "${PWD}/.ant/partners:/work/data/partners" \
  -e QUARKUS_DATASOURCE_JDBC_URL=jdbc:mysql://abstratium-mysql:3306/abstraccount \
  -e QUARKUS_DATASOURCE_USERNAME=abstraccount \
  -e QUARKUS_DATASOURCE_PASSWORD=secret \
  -e ABSTRATIUM_CLIENT_ID="${ABSTRATIUM_CLIENT_ID}" \
  -e ABSTRATIUM_CLIENT_SECRET="${ABSTRATIUM_CLIENT_SECRET}" \
  -e DEFAULT_ORG_UUID="${DEFAULT_ORG_UUID}" \
  -e QUARKUS_OIDC_AUTH_SERVER_URL="https://auth-t.abstratium.dev" \
  -e QUARKUS_OIDC_AUTHENTICATION_FORCE_REDIRECT_HTTPS_SCHEME=false \
  -e CSRF_TOKEN_SIGNATURE_KEY="KU/PESqYGdsE0psW7aOaXF/tszvDKCecFo/1u3tSKoQmo4YZfEjZNvUppot1svY1Yj9oub4GSy/5mueqfRlKOw==" \
  -e COOKIE_ENCRYPTION_SECRET="dnde2xhez89RGV0nJHqSR8Khu3SFCE6fxqCgDzu9Hng=" \
  -e SMTP_HOST="${SMTP_HOST}" \
  -e SMTP_PORT="${SMTP_PORT}" \
  -e SMTP_USERNAME="${SMTP_USERNAME}" \
  -e SMTP_PASSWORD="${SMTP_PASSWORD}" \
  -e EMAIL_FROM="${EMAIL_FROM}" \
  -e ANTHROPIC_API_KEY="not-set" \
  -e QUARKUS_MANAGEMENT_HOST=0.0.0.0 \
  -e DEPLOYMENT_ENV="dev" \
  -e ABSTRATIUM_TOGGLES_API_URL="${ABSTRATIUM_TOGGLES_API_URL}" \
  -e ABSTRATIUM_TOGGLES_CONTEXT="${ABSTRATIUM_TOGGLES_CONTEXT}" \
  -e STAGE="dev" \
  -e ABSTRAUTH_WARNING_MESSAGE="You are in a development environment" \
  -e ABSTRAUTH_EMAIL_ENABLED=false \
  -e ABSTRAUTH_BASE_URL="http://localhost:8083" \
  -e QUARKUS_OIDC_TOKEN_ISSUER="https://test.abstrauth.abstratium.dev" \
  ghcr.io/abstratium-dev/abstraccount:latest
```

e2e tests will work against this running image. see dev readme for tips on how to run them manually.

Delete test accounts as follows (which cascade deletes other data like federated identities, roles, credentials, authorization codes, etc.):

```
delete from T_TODO;
```

### Deploy to GitHub Container Registry

After building, the upload is based on https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

Create a personal access token with `read:packages`, `write:packages` and `delete:packages`. (Settings > Developer Settings > Personal access token > Tokens (classic) > Generate new token classic). Select 30 days.

Export it as follows:

```
export CR_PAT=your_token_here
```

(alternatively add it to `/w/abstratium-abstraccount.env`)

Run the script named `./push-docker-image.sh`, which also tags the source code and pushes it to GitHub.

You are now finished. Re-install in test and production environments.
