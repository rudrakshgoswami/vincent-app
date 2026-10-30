import ContactMessage from '../models/ContactMessage.js';
import Settings from '../models/Settings.js';

// @desc    Get Dynamic Restaurant Info for Contact Page
// @route   GET /api/contact/info
// @access  Public
export const getContactInfo = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const info = {
            name: settings.name,
            address: settings.address,
            landmark: settings.landmark,
            phone: settings.phone,
            email: settings.email,
            weekdayHours: settings.weekdayHours,
            weekendHours: settings.weekendHours,
            googleMapLink: settings.googleMapLink,
            socialLinks: settings.socialLinks
        };

        res.json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit Contact Form (links to user if logged in)
// @route   POST /api/contact
// @access  Public (or authenticated)
export const submitContactForm = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }

        const newMessage = await ContactMessage.create({
            userId: req.user?._id || null,
            name,
            email,
            phone,
            subject,
            message
        });

        res.status(201).json({
            success: true,
            message: 'Your inquiry has been submitted successfully. We will get back to you soon!',
            data: newMessage
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get All Messages (Admin)
// @route   GET /api/contact/admin/messages
// @access  Private/Admin
export const getAllMessages = async (req, res) => {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update Message Status (Admin)
// @route   PUT /api/contact/admin/messages/:id
// @access  Private/Admin
export const updateMessageStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const message = await ContactMessage.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        if (status) message.status = status;
        if (adminNotes !== undefined) message.adminNotes = adminNotes;

        await message.save();
        res.json({ success: true, data: message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Admin Reply to a Message
// @route   POST /api/contact/admin/messages/:id/reply
// @access  Private/Admin
export const replyToMessage = async (req, res) => {
    try {
        const { message: replyText } = req.body;

        if (!replyText || !replyText.trim()) {
            return res.status(400).json({ success: false, message: 'Reply message is required' });
        }

        const contactMessage = await ContactMessage.findById(req.params.id);
        if (!contactMessage) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        contactMessage.replies.push({
            message: replyText.trim(),
            repliedBy: req.user._id,
            repliedByName: req.user.name || 'Admin'
        });

        // Auto-update status to 'replied'
        contactMessage.status = 'replied';

        await contactMessage.save();
        res.json({ success: true, data: contactMessage });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete Message (Admin)
// @route   DELETE /api/contact/admin/messages/:id
// @access  Private/Admin
export const deleteMessage = async (req, res) => {
    try {
        const message = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get User's Own Messages + Replies
// @route   GET /api/contact/my-messages
// @access  Private (logged-in user)
export const getMyMessages = async (req, res) => {
    try {
        const messages = await ContactMessage.find({
            $or: [
                { userId: req.user._id },
                { email: req.user.email }
            ]
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
