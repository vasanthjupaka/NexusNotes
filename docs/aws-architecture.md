# AWS Architecture & Cloud Design — NexusNotes

## Cloud Architecture Diagram

```mermaid
flowchart TD
    User["🌐 End User (Browser)"] -->|HTTPS / Port 443| ALB["Application Load Balancer\n(ACM TLS Certificate)"]
    ALB -->|HTTP / Port 80| EC2["Amazon EC2 Instance\n(Docker Compose Host)"]

    subgraph EC2_Container["🐳 EC2 Docker Host (t3.small / t3.medium)"]
        Nginx["Nginx Reverse Proxy"]
        Frontend["Frontend SPA"]
        Backend["FastAPI Backend"]
        DB["MySQL 8 (Local / Dev)"]
        Nginx --> Frontend
        Nginx --> Backend
        Backend --> DB
    end

    subgraph AWS_Managed_Services["☁️ Managed AWS Cloud Services"]
        S3["Amazon S3 Bucket\n(nexusnotes-assets)\n[Private / SSE-S3]"]
        ECR["Amazon ECR\n(Container Registry)"]
        IAM["IAM Role / Instance Profile\n(nexusnotes-ec2-role)"]
        CW["Amazon CloudWatch\n(Logs & Metrics)"]
    end

    Backend -->|Boto3 (IAM Instance Profile)| S3
    Backend -->|JSON Logs| CW
    IAM -->|Assumed by| EC2
    ECR -->|Docker Pull| EC2
```

---

## AWS Services Deep Dive & Training Reference

### 1. Amazon EC2 (Compute Host)
- **What it is**: Scalable virtual server in the cloud.
- **Why it is used**: Hosts the Dockerized microservices stack for NexusNotes.
- **Security**: Placed in a VPC public/private subnet with Security Groups restricting ingress to ports 80/443. Access managed via AWS Systems Manager Session Manager (SSM) without requiring open SSH port 22.
- **Cost**: `t3.small` (~$15/month) or free tier `t2.micro` for learning/testing.

### 2. Amazon S3 (Object Storage)
- **What it is**: High-durability (99.999999999% 11 9s) object storage.
- **Why it is used**: Stores user uploaded images, drawings, and attachments.
- **Security**: Bucket is strictly private with public access blocked. Requests are signed using AWS SigV4, and clients access images through short-lived pre-signed URLs.

### 3. AWS IAM (Identity & Access Management)
- **What it is**: Fine-grained access control for AWS resources.
- **Why it is used**: Assigns the EC2 instance an IAM Role with least-privilege permissions, completely eliminating long-lived AWS Access Keys (`AKIA...`) from the server.

### 4. Amazon ECR (Elastic Container Registry)
- **What it is**: Fully managed private Docker container registry.
- **Why it is used**: Stores immutable, vulnerability-scanned Docker images built by GitHub Actions CI/CD pipelines.

### 5. Amazon CloudWatch
- **What it is**: Centralized logging, metrics collection, and alerting service.
- **Why it is used**: Captures structured JSON access and error logs from the backend and Docker containers.
