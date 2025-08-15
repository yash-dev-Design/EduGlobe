const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.getPublicProfile()
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile'
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters'),
    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
    body('phone')
        .optional()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please enter a valid phone number'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Location cannot exceed 100 characters'),
    body('website')
        .optional()
        .matches(/^https?:\/\/.+/)
        .withMessage('Please enter a valid URL')
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

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update allowed fields
        const allowedUpdates = ['fullName', 'bio', 'phone', 'location', 'website', 'socialLinks', 'preferences'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                user[field] = req.body[field];
            }
        });

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: user.getPublicProfile()
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile'
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (public profile)
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.getPublicProfile()
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user'
        });
    }
});

// @route   GET /api/users/instructors
// @desc    Get all instructors
// @access  Public
router.get('/instructors', async (req, res) => {
    try {
        const instructors = await User.find({
            role: 'instructor',
            isActive: true,
            isDeleted: false
        }).select('fullName avatar bio socialLinks');

        res.json({
            success: true,
            data: { instructors }
        });

    } catch (error) {
        console.error('Get instructors error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching instructors'
        });
    }
});

// Admin routes
// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;

        const filter = { isDeleted: false };
        if (role) filter.role = role;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(filter)
            .select('-password -emailVerificationToken -passwordResetToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalUsers: total,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users'
        });
    }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (admin only)
// @access  Private (Admin only)
router.put('/:id/role', auth, authorize('admin'), [
    body('role')
        .isIn(['student', 'instructor', 'admin'])
        .withMessage('Invalid role')
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

        const { role } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: {
                user: user.getPublicProfile()
            }
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user role'
        });
    }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (admin only)
// @access  Private (Admin only)
router.put('/:id/status', auth, authorize('admin'), [
    body('isActive')
        .isBoolean()
        .withMessage('isActive must be a boolean')
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

        const { isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                user: user.getPublicProfile()
            }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status'
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete
        user.isDeleted = true;
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user'
        });
    }
});

module.exports = router; 