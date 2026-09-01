# CI/CD Pipeline Guide — NexusNotes

## GitHub Actions Workflow Pipeline

The NexusNotes repository implements three automated GitHub Actions workflows:

```
                  ┌───────────────────────────────┐
                  │ Push / PR to main or develop  │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
             ┌─────────────────────────────────────────┐
             │       .github/workflows/ci.yml          │
             │  - Backend: Ruff lint + Pytest          │
             │  - Frontend: ESLint + Vitest + Typecheck│
             └────────────────────┬────────────────────┘
                                  │ (On merge to main)
                                  ▼
             ┌─────────────────────────────────────────┐
             │      .github/workflows/docker.yml       │
             │  - Multi-stage Docker image builds      │
             │  - Aqua Security Trivy scan             │
             │  - Push tagged images to AWS ECR        │
             └────────────────────┬────────────────────┘
                                  │ (Workflow trigger)
                                  ▼
             ┌─────────────────────────────────────────┐
             │      .github/workflows/deploy.yml       │
             │  - EC2 Pull from ECR & Docker up -d     │
             │  - Automated HTTP /api/health check     │
             └─────────────────────────────────────────┘
```

---

## Required GitHub Secrets for AWS Integration

| Secret Key | Description | Example |
|---|---|---|
| `AWS_ROLE_ARN` | GitHub OIDC IAM Role ARN to assume | `arn:aws:iam::123456789012:role/GitHubActionsECRRole` |
| `AWS_ACCOUNT_ID`| 12-digit AWS Account ID | `123456789012` |
| `AWS_REGION` | Target AWS Region | `us-east-1` |
| `EC2_HOST` | Public IP or DNS of EC2 host | `54.210.12.34` |
| `EC2_SSH_KEY` | Private SSH deployment key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
