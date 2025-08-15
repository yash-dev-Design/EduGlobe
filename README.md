# 📚 EduGlobe – Online Learning Platform

A modern, user-friendly **online learning platform** for students, teachers, and professionals.  
EduGlobe enables **course creation, interactive learning, live classes, progress tracking, and certification** — all in one place.

---

## 🚀 Features

- **Course Management** – Create, edit, and manage courses with videos, quizzes, and resources  
- **Live Classes** – Real-time teaching via video conferencing integration  
- **Student Dashboard** – Track progress, completed lessons, and upcoming classes  
- **Instructor Dashboard** – Manage students, assignments, and grades  
- **Interactive Quizzes** – Auto-graded quizzes to assess learning  
- **Certificates** – Automatically generate course completion certificates  
- **Multi-Role Authentication** – Separate logins for students, instructors, and admins  
- **Responsive UI** – Fully functional on desktop, tablet, and mobile devices  
- **Dark & Light Mode** – Seamless theme switching  

---

## 🛠️ Tech Stack

**Frontend:**
- React.js / Next.js
- Tailwind CSS / Material UI
- Chart.js for analytics

**Backend:**
- Node.js + Express.js
- MongoDB / PostgreSQL
- WebSocket / Socket.io (for live chat & notifications)

**Other Tools:**
- JWT Authentication
- AWS S3 / Firebase for file & video storage
- Zoom SDK / Jitsi Meet API for live classes

---

## 📂 Project Structure

eduglobe/
│── client/ # Frontend code
│ ├── public/ # Static files
│ ├── src/ # Components, pages, hooks
│
│── server/ # Backend code
│ ├── models/ # Database models
│ ├── routes/ # API routes
│ ├── controllers/# Logic handlers
│
│── .env.example # Environment variables template
│── package.json
│── README.md


---

## ⚡ Getting Started

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/eduglobe.git
cd eduglobe


# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install


PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
AWS_S3_KEY=your_s3_key
AWS_S3_SECRET=your_s3_secret
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret


# Start backend
cd server
npm run dev

# Start frontend
cd ../client
npm start
