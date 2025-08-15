# EduGlobe - Premium Online Learning Platform

EduGlobe is a modern, feature-rich online learning platform built with Node.js, Express, MongoDB, and a beautiful responsive frontend. The platform offers comprehensive course management, user authentication, enrollment tracking, and payment processing.

## 🌟 Features

### Frontend Features
- **Rich Color Theme**: Professional deep blue and red color scheme
- **Premium Typography**: Playfair Display and Source Sans Pro fonts
- **Responsive Design**: Mobile-first approach with modern UI/UX
- **Interactive Sections**: 
  - Hero section with call-to-action
  - Premium courses showcase (15 courses)
  - Course categories (15 categories)
  - About section with mission, vision, and values
  - Statistics section with key metrics
  - Expert instructors showcase (10 instructors)
  - Course details section explaining benefits
  - Student testimonials with real photos (10 testimonials)
- **Modal System**: Scrollable login, signup, and purchase modals
- **Smooth Animations**: AOS (Animate On Scroll) integration
- **Professional Branding**: EduGlobe branding throughout

### Backend Features
- **User Authentication**: JWT-based authentication with password hashing
- **User Management**: Complete user CRUD operations with role-based access
- **Course Management**: Full course lifecycle management
- **Enrollment System**: Track student progress and course completion
- **Payment Processing**: Support for multiple payment methods
- **Review System**: Course ratings and reviews
- **Certificate Generation**: Automatic certificate issuance
- **Refund Management**: Complete refund request and processing system
- **Admin Panel**: Comprehensive admin dashboard
- **API Security**: Rate limiting, input validation, and CORS protection

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd e-learn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration:
   - MongoDB connection string
   - JWT secret key
   - Email configuration
   - Payment gateway keys

4. **Start MongoDB**
   ```bash
   # Start MongoDB service
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## 📁 Project Structure

```
e-learn/
├── index.html                 # Main frontend file
├── package.json              # Backend dependencies
├── server.js                 # Main server file
├── env.example              # Environment variables template
├── README.md                # This file
├── models/                  # Database models
│   ├── User.js             # User model
│   ├── Course.js           # Course model
│   └── Enrollment.js       # Enrollment model
├── routes/                  # API routes
│   ├── auth.js             # Authentication routes
│   ├── courses.js          # Course management routes
│   ├── users.js            # User management routes
│   └── enrollments.js      # Enrollment routes
└── middleware/              # Custom middleware
    └── auth.js             # Authentication middleware
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - User logout

### Courses
- `GET /api/courses` - Get all courses with filtering
- `GET /api/courses/featured` - Get featured courses
- `GET /api/courses/categories` - Get course categories
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create new course (instructor/admin)
- `PUT /api/courses/:id` - Update course (instructor/admin)
- `DELETE /api/courses/:id` - Delete course (instructor/admin)
- `POST /api/courses/:id/reviews` - Add course review

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get public user profile
- `GET /api/users/instructors` - Get all instructors
- `GET /api/users` - Get all users (admin)
- `PUT /api/users/:id/role` - Update user role (admin)
- `PUT /api/users/:id/status` - Update user status (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Enrollments
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-courses` - Get user's enrolled courses
- `GET /api/enrollments/:id` - Get enrollment details
- `PUT /api/enrollments/:id/progress` - Update course progress
- `POST /api/enrollments/:id/review` - Add course review
- `POST /api/enrollments/:id/certificate` - Issue certificate
- `POST /api/enrollments/:id/refund` - Request refund
- `GET /api/enrollments` - Get all enrollments (admin)
- `PUT /api/enrollments/:id/refund-status` - Update refund status (admin)

## 🎨 Frontend Features

### Color Scheme
- **Primary**: Deep Blue (#1e3c72, #2a5298, #4a90e2)
- **Accent**: Red (#e74c3c, #c0392b)
- **Background**: Light gradient (#f5f7fa, #c3cfe2)
- **Text**: Dark gray (#2c3e50)

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Source Sans Pro (sans-serif)
- **Professional**: Merriweather (serif)

### Sections
1. **Hero Section**: Transformative messaging with CTA buttons
2. **Premium Courses**: 15 featured courses with rich details
3. **Categories**: 15 course categories with icons
4. **About**: Mission, vision, and values
5. **Statistics**: Key platform metrics
6. **Instructors**: 10 expert instructor profiles
7. **Course Details**: Benefits and features explanation
8. **Testimonials**: 10 student testimonials with photos
9. **Footer**: Contact information and links

## 🔐 Security Features

- **Password Hashing**: bcryptjs with configurable rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Express-validator for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet**: Security headers middleware
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## 📊 Database Models

### User Model
- Authentication fields (email, password)
- Profile information (name, bio, avatar)
- Role-based access (student, instructor, admin)
- Social links and preferences
- Login history and security tokens

### Course Model
- Course details (title, description, category)
- Instructor information
- Pricing and discounts
- Content structure (lectures, sections)
- Ratings and reviews
- Analytics and SEO

### Enrollment Model
- Student-course relationship
- Progress tracking
- Payment information
- Certificate management
- Refund processing

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Variables
Make sure to set all required environment variables in your `.env` file:
- Database connection
- JWT secrets
- Email configuration
- Payment gateway keys
- File upload credentials

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

### Recent Changes
- Updated color scheme to rich professional colors
- Added 10 more course cards (total 15)
- Added 10 more category cards (total 15)
- Added 5 more testimonials with student photos (total 10)
- Added new sections: About, Statistics, Instructors, Course Details
- Made modals scrollable to prevent overflow
- Changed branding from "EduLearn Pro" to "EduGlobe"
- Implemented complete backend with MongoDB
- Added comprehensive API endpoints
- Implemented user authentication and authorization
- Added course enrollment and progress tracking
- Implemented payment processing and refund system

---

**EduGlobe** - Transform Your Future with Premium Online Education 