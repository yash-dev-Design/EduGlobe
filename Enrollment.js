const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required']
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Instructor is required']
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    completionDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'expired'],
        default: 'active'
    },
    progress: {
        type: Number,
        default: 0,
        min: [0, 'Progress cannot be negative'],
        max: [100, 'Progress cannot exceed 100%']
    },
    completedLectures: [{
        lecture: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lecture'
        },
        completedAt: {
            type: Date,
            default: Date.now
        },
        timeSpent: {
            type: Number, // in seconds
            default: 0
        }
    }],
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    totalTimeSpent: {
        type: Number, // in minutes
        default: 0
    },
    certificate: {
        issued: {
            type: Boolean,
            default: false
        },
        issuedAt: Date,
        certificateId: String,
        downloadUrl: String
    },
    payment: {
        amount: {
            type: Number,
            required: [true, 'Payment amount is required']
        },
        currency: {
            type: String,
            default: 'USD'
        },
        method: {
            type: String,
            enum: ['credit_card', 'paypal', 'stripe', 'bank_transfer', 'crypto'],
            required: [true, 'Payment method is required']
        },
        transactionId: {
            type: String,
            required: [true, 'Transaction ID is required']
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        paidAt: {
            type: Date,
            default: Date.now
        }
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    rating: {
        given: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5']
        },
        review: {
            type: String,
            maxlength: [1000, 'Review cannot exceed 1000 characters']
        },
        reviewedAt: Date
    },
    accessExpiry: {
        type: Date
    },
    isLifetime: {
        type: Boolean,
        default: true
    },
    refundRequested: {
        type: Boolean,
        default: false
    },
    refundReason: {
        type: String,
        maxlength: [500, 'Refund reason cannot exceed 500 characters']
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    refundProcessedAt: Date,
    refundAmount: Number
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for enrollment duration
enrollmentSchema.virtual('enrollmentDuration').get(function() {
    const endDate = this.completionDate || new Date();
    return Math.ceil((endDate - this.enrollmentDate) / (1000 * 60 * 60 * 24));
});

// Virtual for isCompleted
enrollmentSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed' || this.progress === 100;
});

// Virtual for isExpired
enrollmentSchema.virtual('isExpired').get(function() {
    if (this.isLifetime) return false;
    return this.accessExpiry && new Date() > this.accessExpiry;
});

// Indexes for better query performance
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ instructor: 1 });
enrollmentSchema.index({ enrollmentDate: -1 });
enrollmentSchema.index({ 'payment.status': 1 });

// Pre-save middleware to update completion status
enrollmentSchema.pre('save', function(next) {
    if (this.progress === 100 && this.status !== 'completed') {
        this.status = 'completed';
        this.completionDate = new Date();
    }
    next();
});

// Method to mark lecture as completed
enrollmentSchema.methods.completeLecture = function(lectureId, timeSpent = 0) {
    const existingIndex = this.completedLectures.findIndex(
        cl => cl.lecture.toString() === lectureId.toString()
    );
    
    if (existingIndex === -1) {
        this.completedLectures.push({
            lecture: lectureId,
            timeSpent
        });
    }
    
    // Update progress
    this.updateProgress();
    this.lastAccessed = new Date();
    
    return this.save();
};

// Method to update progress
enrollmentSchema.methods.updateProgress = function() {
    // This would typically calculate based on total lectures in the course
    // For now, we'll use a simple calculation
    if (this.completedLectures.length > 0) {
        // This is a simplified calculation - in reality, you'd get total lectures from course
        this.progress = Math.min(100, (this.completedLectures.length * 10)); // Assuming 10 lectures per course
    }
};

// Method to issue certificate
enrollmentSchema.methods.issueCertificate = function() {
    if (this.progress === 100 && !this.certificate.issued) {
        this.certificate.issued = true;
        this.certificate.issuedAt = new Date();
        this.certificate.certificateId = `CERT-${this._id}-${Date.now()}`;
        this.certificate.downloadUrl = `/certificates/${this.certificate.certificateId}`;
        return this.save();
    }
    throw new Error('Cannot issue certificate: course not completed or already issued');
};

// Method to request refund
enrollmentSchema.methods.requestRefund = function(reason) {
    if (this.refundRequested) {
        throw new Error('Refund already requested');
    }
    
    this.refundRequested = true;
    this.refundReason = reason;
    this.refundStatus = 'pending';
    
    return this.save();
};

// Static method to find active enrollments for a student
enrollmentSchema.statics.findActiveByStudent = function(studentId) {
    return this.find({ 
        student: studentId, 
        status: 'active' 
    }).populate('course', 'title thumbnail duration instructor');
};

// Static method to find enrollments by course
enrollmentSchema.statics.findByCourse = function(courseId) {
    return this.find({ course: courseId }).populate('student', 'fullName email avatar');
};

// Static method to get enrollment statistics
enrollmentSchema.statics.getStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalEnrollments: { $sum: 1 },
                activeEnrollments: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                completedEnrollments: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                totalRevenue: { $sum: '$payment.amount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Enrollment', enrollmentSchema); 