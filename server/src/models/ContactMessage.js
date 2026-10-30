import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true
    },
    repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    repliedByName: {
        type: String,
        default: 'Admin'
    }
}, {
    timestamps: true
});

const contactMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    phone: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        enum: ['General Inquiry', 'Complaint', 'Catering', 'Reservation Issue']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['new', 'replied', 'archived'],
        default: 'new'
    },
    adminNotes: {
        type: String,
        default: ''
    },
    replies: [replySchema]
}, {
    timestamps: true
});

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
