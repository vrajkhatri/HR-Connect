# HRConnect - Professional HR Management System

![HRConnect Logo](https://img.shields.io/badge/HRConnect-Professional-blue)
![React](https://img.shields.io/badge/React-18.x-61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-4169E1)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748)

A complete, professional HR Management System built with React, Node.js, Express, and PostgreSQL.

## 🚀 Features

### Authentication
- ✅ Login with JWT
- ✅ Registration with employee profile
- ✅ Forgot Password with OTP (Gmail)
- ✅ Role-based access (Employee/HR/Admin)

### Employee Features
- ✅ Dashboard with stats and charts
- ✅ Apply Leave (weekends blocked)
- ✅ My Leaves with Manual badge
- ✅ Leave Balance with breakdown
- ✅ Profile editing
- ✅ Change Password

### HR Features
- ✅ HR Dashboard with analytics
- ✅ Employee Management (CRUD)
- ✅ Department Management (CRUD)
- ✅ Leave Types with Monthly Credits
- ✅ Leave Requests with search/filters
- ✅ Leave Calendar
- ✅ Reports with charts
- ✅ Audit Trail
- ✅ PDF Export (First Half/Second Half)
- ✅ Excel Export (First Half/Second Half)

### Leave Management
- ✅ Manual Add/Deduct Leave
- ✅ Compensatory Off Support
- ✅ Monthly Credits (Annual: 1 day/month)
- ✅ Balance Breakdown
- ✅ Adjustment History
- ✅ Color-coded rows
- ✅ Notifications for all actions
- ✅ Notification Bell with real-time updates

## 🛠️ Tech Stack

**Frontend:**
- React.js 18
- React Router DOM 6
- Bootstrap 5
- Chart.js
- FullCalendar
- Axios

**Backend:**
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt Password Hashing

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- npm or yarn
- Git

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/HRConnect_React_Professional.git
cd HRConnect_React_Professional
2. Backend Setup
bash
cd backend
npm install
cp .env.example .env
# Update .env with your database credentials
npx prisma db push
npx prisma generate
npm run seed
npm run dev
3. Frontend Setup
bash
cd frontend
npm install
npm run dev
4. Access the Application
Frontend: http://localhost:5173

Backend: http://localhost:5000

🔑 Login Credentials
Role	Email	Password
Admin	admin@hrconnect.com	password123
HR	hr@hrconnect.com	password123
Employee	john@hrconnect.com	password123
📊 Database Schema
Models
User - Authentication & user details

EmployeeProfile - Employee-specific information

Department - Organization departments

LeaveType - Leave types with monthly credits

LeaveBalance - Current year balance

LeaveBalanceHistory - Monthly balance history

LeaveRequest - Leave applications

Notification - User notifications

AuditLog - Action audit trail

📁 Project Structure
text
HRConnect_React_Professional/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth guards
│   │   ├── utils/           # Helpers
│   │   └── config/          # Prisma config
│   ├── prisma/              # Database schema
│   └── scripts/             # Utility scripts
└── frontend/
    ├── src/
    │   ├── pages/           # All pages
    │   ├── components/      # Reusable components
    │   ├── api/             # API calls
    │   ├── context/         # Auth provider
    │   └── layouts/         # App layout
    ├── public/              # Static assets
    └── package.json
🎯 Features Demo
Leave Management
Generate monthly credits

Manual add/deduct leave

View adjustment history

Balance breakdown

Notifications
Real-time notification bell

Mark as read

Mark all as read

Reports
PDF Export

Excel Export

Charts and analytics

🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

📄 License
This project is licensed under the MIT License.

🙏 Acknowledgments
React

Node.js

Prisma

PostgreSQL

Bootstrap

Made By [Vraj Khatri]
