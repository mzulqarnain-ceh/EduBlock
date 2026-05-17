# 🎓 EduBlock — Blockchain-Powered Educational Certificate Verification System

EduBlock is a full-stack web application that uses **blockchain technology** to securely issue, manage, and verify educational certificates. It provides tamper-proof certificate verification through Ethereum smart contracts (NFT-based) and a modern web dashboard.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy, PostgreSQL |
| **Blockchain** | Solidity 0.8.19, Web3.py, Ganache (local dev) |
| **Smart Contract** | ERC721-style NFT Certificates (mint, verify, revoke) |
| **Auth** | JWT Token-based authentication |

## 📦 Project Structure

```
EduBlock/
├── edublock-backend/           # FastAPI Backend
│   ├── app/
│   │   ├── models/             # SQLAlchemy Models (User, Degree, Transaction, AuditLog)
│   │   ├── routers/            # API Routes (auth, degrees, verification, audit, etc.)
│   │   ├── schemas/            # Pydantic Schemas
│   │   ├── services/           # Blockchain & Email Services
│   │   ├── utils/              # Security Utilities (JWT, password hashing)
│   │   └── main.py             # FastAPI app entry point
│   ├── contracts/              # Solidity Smart Contract
│   │   ├── EduBlockCertificate.sol
│   │   └── compiled/           # Auto-generated ABI & bytecode
│   ├── requirements.txt
│   └── .env                    # Environment variables
│
├── edublock-frontend/          # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components (Dashboard, Verification, etc.)
│   │   ├── services/           # API service layer
│   │   └── utils/              # Utility functions
│   └── package.json
│
└── .gitignore
```

## 🔧 Setup & Installation

### Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.12+
- **PostgreSQL** (running with a database named `edublock`)
- **Git**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/mzulqarnain-ceh/EduBlock.git
cd EduBlock
```

### 2️⃣ Backend Setup

```bash
cd edublock-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
python -m pip install -r requirements.txt
```

Create `.env` file in `edublock-backend/`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edublock
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
DEPLOYER_PRIVATE_KEY=
APP_NAME=EduBlock
APP_VERSION=1.0.0
FRONTEND_URL=http://localhost:5173
```

### 3️⃣ Frontend Setup

```bash
cd edublock-frontend
npm install
```

## ▶️ Running the Project

You need **3 terminals** running simultaneously:

### Terminal 1 — Blockchain (Ganache)
```bash
npx -y ganache --port 8545
```

### Terminal 2 — Backend
```bash
cd edublock-backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```
> The backend auto-deploys the smart contract on startup if `CONTRACT_ADDRESS` is empty.

### Terminal 3 — Frontend
```bash
cd edublock-frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `super@admin.com` | `test` |
| Super Admin | `superadmin@edublock.com` | `admin123` |
| Institute Admin | `admin@test.com` | `test` |
| Institute Admin | `admin@university.edu` | `admin123` |
| Student | `student@test.com` | `test` |
| Student | `student@example.com` | `student123` |

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user profile |

### Certificates
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/degrees/issue` | Issue certificate (Admin) |
| POST | `/api/degrees/bulk-issue` | Bulk issue from CSV (Admin) |
| GET | `/api/degrees/` | List certificates |
| GET | `/api/degrees/{id}` | Get certificate details |
| POST | `/api/degrees/{id}/revoke` | Revoke certificate |
| DELETE | `/api/degrees/{id}` | Delete certificate |

### Verification (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verify/` | Verify by hash/token/ID |
| GET | `/api/verify/{token_id}` | Verify by token (shareable link) |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/logs` | Get paginated audit logs |

### Others
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard statistics |
| CRUD | `/api/universities/` | Manage universities |
| CRUD | `/api/users/` | Manage users |

## 🔗 Blockchain Integration

- **Smart Contract**: `EduBlockCertificate.sol` — ERC721-style NFT contract
- **Actions**: Mint (issue), Verify, Revoke certificates on-chain
- **Ganache**: Local development blockchain (ephemeral — data clears on restart)
- **Auto-Deploy**: Backend automatically deploys contract if none exists

### Certificate Flow
```
Admin Issues Certificate
    → Backend creates DB record
    → Smart contract mints NFT (token)
    → Transaction hash stored in DB
    → Student sees certificate in dashboard
    → Anyone can verify with hash on Verification page
```

## ⚠️ Important Notes

1. **Ganache is ephemeral** — blockchain data is lost on restart. The backend handles re-deployment automatically.
2. **Keep `CONTRACT_ADDRESS` empty** in `.env` for auto-deployment.
3. **Student linking** — When issuing certificates, use the student's **email** as Student ID for proper dashboard linking.
4. **Email notifications** — Configure SMTP settings in `.env` to enable email notifications on certificate issue/revoke.

## 👤 Author

- **Muhammad Zulqarnain** — [GitHub](https://github.com/mzulqarnain-ceh)

## 📄 License

This project is part of a Final Year Project (FYP) for educational purposes.
