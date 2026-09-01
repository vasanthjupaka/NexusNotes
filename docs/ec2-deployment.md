# EC2 Deployment Guide — NexusNotes

## Step-by-Step EC2 Provisioning

### 1. Launch EC2 Instance
- **AMI**: Ubuntu Server 22.04 LTS or 24.04 LTS (64-bit x86)
- **Instance Type**: `t3.small` (2 vCPU, 2GB RAM)
- **Storage**: 20 GB gp3 SSD
- **Security Group Rules**:
  - Inbound HTTP (80): `0.0.0.0/0`
  - Inbound HTTPS (443): `0.0.0.0/0`
  - Inbound SSH (22): Your specific IP (or connect via AWS Systems Manager Session Manager)

### 2. Attach IAM Role
Attach the IAM instance profile created from `infrastructure/aws/iam-policy.json` to the EC2 instance:
- Allows `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `nexusnotes-assets/*`.
- Allows `ecr:GetAuthorizationToken` and image pulls.
- Allows CloudWatch log forwarding.

### 3. Install Docker & Docker Compose on EC2
```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to execute docker
sudo usermod -aG docker ubuntu
newgrp docker
```

### 4. Deploy NexusNotes Application
```bash
# Clone the repository
git clone https://github.com/vasanthjupaka/NexusNotes.git /opt/nexusnotes
cd /opt/nexusnotes

# Set up production environment variables
cp .env.example .env
nano .env

# Run database migrations
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Seed initial demonstration data
docker compose -f docker-compose.prod.yml run --rm backend python scripts/seed.py

# Start production stack
docker compose -f docker-compose.prod.yml up -d

# Verify health status
curl http://localhost/api/health
```
