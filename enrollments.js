const express = require('express');
const { body, validationResult } = require('express-validator');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/enrollments
// @desc    Enroll in a course
// @access  Private
router.post('/', auth, [
    body('courseId')
        .isMongoId()
        .withMessage('Valid course ID is required'),
    body('paymentMethod')
        .isIn(['credit_card', 'paypal', 'stripe', 'bank_transfer', 'crypto'])
        .withMessage('Valid payment method is required'),
    body('transactionId')
        .notEmpty()
        .withMessage('Transaction ID is required')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { courseId, paymentMethod, transactionId } = req.body;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (course.status !== 'published') {
            return res.status(400).json({
                success: false,
                message: 'Course is not available for enrollment'
            });
        }

        // Check if user is already enrolled
        const existingEnrollment = await Enrollment.findOne({
            student: req.user.userId,
            course: courseId
        });

        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'You are already enrolled in this course'
            });
        }

        // Create enrollment
        const enrollment = new Enrollment({
            student: req.user.userId,
            course: courseId,
            instructor: course.instructor,
            payment: {
                amount: course.price,
                currency: course.currency,
                method: paymentMethod,
                transactionId,
                status: 'completed',
                paidAt: new Date()
            }
        });

        await enrollment.save();

        // Update course enrollment count
        course.enrollmentCount += 1;
        await course.save();

        // Populate course and instructor details
        await enrollment.populate([
            { path: 'course', select: 'title thumbnail duration instructor' },
            { path: 'instructor', select: 'fullName avatar' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Successfully enrolled in course',
            data: { enrollment }
        });

    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while enrolling in course'
        });
    }
});

// @route   GET /api/enrollments/my-courses
// @desc    Get user's enrolled courses
// @access  Private
router.get('/my-courses', auth, async (req, res) => {
    try {
        const { status = 'active' } = req.query;

        const filter = { student: req.user.userId };
        if (status !== 'all') {
            filter.status = status;
        }

        const enrollments = await Enrollment.find(filter)
            .populate('course', 'title thumbnail duration instructor rating')
            .populate('instructor', 'fullName avatar')
            .sort({ enrollmentDate: -1 });

        res.json({
            success: true,
            data: { enrollments }
        });

    } catch (error) {
        console.error('Get my courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching enrolled courses'
        });
    }
});

// @route   GET /api/enrollments/:id
// @desc    Get enrollment details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id)
            .populate('course')
            .populate('instructor', 'fullName avatar bio')
            .populate('student', 'fullName email avatar');

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Check if user is authorized to view this enrollment
        if (enrollment.student._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this enrollment'
            });
        }

        res.json({
            success: true,
            data: { enrollment }
        });

    } catch (error) {
        console.error('Get enrollment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching enrollment'
        });
    }
});

// @route   PUT /api/enrollments/:id/progress
// @desc    Update course progress
// @access  Private
router.put('/:id/progress', auth, [
    body('lectureId')
        .isMongoId()
        .withMessage('Valid lecture ID is required'),
    body('timeSpent')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Time spent must be a positive integer')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { lectureId, timeSpent = 0 } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Check if user is authorized
        if (enrollment.student.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this enrollment'
            });
        }

        // Mark lecture as completed
        await enrollment.completeLecture(lectureId, timeSpent);

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: { enrollment }
        });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating progress'
        });
    }
});

// @route   POST /api/enrollments/:id/review
// @desc    Add review to enrolled course
// @access  Private
router.post('/:id/review', auth, [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('review')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Review cannot exceed 1000 characters')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { rating, review } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Check if user is authorized
        if (enrollment.student.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to review this course'
            });
        }

        // Check if already reviewed
        if (enrollment.rating.given) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this course'
            });
        }

        // Add review to enrollment
        enrollment.rating.given = true;
        enrollment.rating.rating = rating;
        enrollment.rating.review = review;
        enrollment.rating.reviewedAt = new Date();

        await enrollment.save();

        // Add review to course
        await enrollment.course.addReview(req.user.userId, rating, review);

        res.json({
            success: true,
            message: 'Review added successfully',
            data: { enrollment }
        });

    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding review'
        });
    }
});

// @route   POST /api/enrollments/:id/certificate
// @desc    Issue certificate for completed course
// @access  Private
router.post('/:id/certificate', auth, async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Check if user is authorized
        if (enrollment.student.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this certificate'
            });
        }

        // Issue certificate
        await enrollment.issueCertificate();

        res.json({
            success: true,
            message: 'Certificate issued successfully',
            data: { 
                certificate: enrollment.certificate,
                enrollment 
            }
        });

    } catch (error) {
        console.error('Issue certificate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while issuing certificate'
        });
    }
});

// @route   POST /api/enrollments/:id/refund
// @desc    Request refund for enrollment
// @access  Private
router.post('/:id/refund', auth, [
    body('reason')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Refund reason must be between 10 and 500 characters')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { reason } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Check if user is authorized
        if (enrollment.student.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to request refund for this enrollment'
            });
        }

        // Request refund
        await enrollment.requestRefund(reason);

        res.json({
            success: true,
            message: 'Refund request submitted successfully',
            data: { enrollment }
        });

    } catch (error) {
        console.error('Request refund error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while requesting refund'
        });
    }
});

// Admin routes
// @route   GET /api/enrollments
// @desc    Get all enrollments (admin only)
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 20, status, courseId, studentId } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (courseId) filter.course = courseId;
        if (studentId) filter.student = studentId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const enrollments = await Enrollment.find(filter)
            .populate('student', 'fullName email')
            .populate('course', 'title')
            .populate('instructor', 'fullName')
            .sort({ enrollmentDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Enrollment.countDocuments(filter);

        res.json({
            success: true,
            data: {
                enrollments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalEnrollments: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching enrollments'
        });
    }
});

// @route   PUT /api/enrollments/:id/refund-status
// @desc    Update refund status (admin only)
// @access  Private (Admin only)
router.put('/:id/refund-status', auth, authorize('admin'), [
    body('refundStatus')
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Invalid refund status'),
    body('refundAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Refund amount must be a positive number')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { refundStatus, refundAmount } = req.body;

        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        enrollment.refundStatus = refundStatus;
        if (refundAmount) {
            enrollment.refundAmount = refundAmount;
        }
        enrollment.refundProcessedAt = new Date();

        await enrollment.save();

        res.json({
            success: true,
            message: 'Refund status updated successfully',
            data: { enrollment }
        });

    } catch (error) {
        console.error('Update refund status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating refund status'
        });
    }
});

module.exports = router; 