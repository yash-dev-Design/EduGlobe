const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Get all courses with filtering and pagination
// @access  Public
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'All Levels']).withMessage('Invalid level'),
    query('priceMin').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
    query('priceMax').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
    query('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('sort').optional().isIn(['title', 'price', 'rating', 'enrollmentCount', 'createdAt']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc')
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

        const {
            page = 1,
            limit = 12,
            category,
            level,
            priceMin,
            priceMax,
            rating,
            search,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        // Build filter object
        const filter = { status: 'published' };

        if (category) filter.category = category;
        if (level && level !== 'All Levels') filter.level = level;
        if (priceMin || priceMax) {
            filter.price = {};
            if (priceMin) filter.price.$gte = parseFloat(priceMin);
            if (priceMax) filter.price.$lte = parseFloat(priceMax);
        }
        if (rating) filter['rating.average'] = { $gte: parseFloat(rating) };

        // Build search query
        if (search) {
            filter.$text = { $search: search };
        }

        // Build sort object
        const sortObj = {};
        sortObj[sort] = order === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query
        const courses = await Course.find(filter)
            .populate('instructor', 'fullName avatar bio')
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-reviews -seo -analytics');

        // Get total count for pagination
        const total = await Course.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                courses,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCourses: total,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching courses'
        });
    }
});

// @route   GET /api/courses/featured
// @desc    Get featured courses
// @access  Public
router.get('/featured', async (req, res) => {
    try {
        const courses = await Course.findFeatured()
            .limit(6)
            .select('-reviews -seo -analytics');

        res.json({
            success: true,
            data: { courses }
        });

    } catch (error) {
        console.error('Get featured courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching featured courses'
        });
    }
});

// @route   GET /api/courses/categories
// @desc    Get all course categories with counts
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await Course.aggregate([
            { $match: { status: 'published' } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    averageRating: { $avg: '$rating.average' },
                    averagePrice: { $avg: '$price' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: { categories }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching categories'
        });
    }
});

// @route   GET /api/courses/:id
// @desc    Get course by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'fullName avatar bio socialLinks')
            .populate('reviews.user', 'fullName avatar');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (course.status !== 'published') {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Increment view count
        course.analytics.views += 1;
        await course.save();

        res.json({
            success: true,
            data: { course }
        });

    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching course'
        });
    }
});

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Instructors only)
router.post('/', auth, authorize('instructor', 'admin'), [
    body('title')
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Title must be between 5 and 100 characters'),
    body('description')
        .trim()
        .isLength({ min: 20, max: 1000 })
        .withMessage('Description must be between 20 and 1000 characters'),
    body('category')
        .isIn([
            'Programming', 'Business', 'Design', 'Languages', 'Music',
            'Cybersecurity', 'Cloud Computing', 'Blockchain', 'Game Development',
            'Artificial Intelligence', 'Mobile Development', 'Data Science',
            'DevOps', 'Professional Skills'
        ])
        .withMessage('Invalid category'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('duration')
        .isInt({ min: 1 })
        .withMessage('Duration must be a positive integer'),
    body('thumbnail')
        .notEmpty()
        .withMessage('Thumbnail is required')
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

        const {
            title,
            description,
            shortDescription,
            category,
            subcategory,
            level,
            language,
            price,
            originalPrice,
            discountPercentage,
            thumbnail,
            previewVideo,
            duration,
            lectures,
            sections,
            learningObjectives,
            requirements,
            targetAudience,
            tags
        } = req.body;

        // Create course
        const course = new Course({
            title,
            description,
            shortDescription,
            instructor: req.user.userId,
            category,
            subcategory,
            level: level || 'All Levels',
            language: language || 'English',
            price,
            originalPrice,
            discountPercentage: discountPercentage || 0,
            thumbnail,
            previewVideo,
            duration,
            lectures: lectures || [],
            sections: sections || [],
            learningObjectives: learningObjectives || [],
            requirements: requirements || [],
            targetAudience: targetAudience || [],
            tags: tags || []
        });

        await course.save();

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: { course }
        });

    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating course'
        });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Course instructor or admin)
router.put('/:id', auth, [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 5, max: 100 })
        .withMessage('Title must be between 5 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 20, max: 1000 })
        .withMessage('Description must be between 20 and 1000 characters'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number')
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

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the instructor or admin
        const user = await User.findById(req.user.userId);
        if (course.instructor.toString() !== req.user.userId && user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this course'
            });
        }

        // Update allowed fields
        const allowedUpdates = [
            'title', 'description', 'shortDescription', 'category', 'subcategory',
            'level', 'language', 'price', 'originalPrice', 'discountPercentage',
            'thumbnail', 'previewVideo', 'duration', 'lectures', 'sections',
            'learningObjectives', 'requirements', 'targetAudience', 'tags',
            'status', 'seo'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                course[field] = req.body[field];
            }
        });

        course.lastUpdated = new Date();
        await course.save();

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: { course }
        });

    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating course'
        });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Course instructor or admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the instructor or admin
        const user = await User.findById(req.user.userId);
        if (course.instructor.toString() !== req.user.userId && user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this course'
            });
        }

        // Soft delete - mark as archived
        course.status = 'archived';
        await course.save();

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });

    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting course'
        });
    }
});

// @route   POST /api/courses/:id/reviews
// @desc    Add review to course
// @access  Private
router.post('/:id/reviews', auth, [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Review comment cannot exceed 1000 characters')
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

        const { rating, comment } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (course.status !== 'published') {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user has already reviewed this course
        const existingReview = course.reviews.find(
            review => review.user.toString() === req.user.userId
        );

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this course'
            });
        }

        // Add review
        await course.addReview(req.user.userId, rating, comment);

        res.json({
            success: true,
            message: 'Review added successfully',
            data: { course }
        });

    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while adding review'
        });
    }
});

module.exports = router; 