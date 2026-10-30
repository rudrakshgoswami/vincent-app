import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import sendSMS from '../utils/sendSMS.js';

// @desc    Update user profile (Name, addresses, profilePicture)
// @route   PUT /api/user/profile
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.profilePicture = req.body.profilePicture || user.profilePicture;

            if (req.body.addresses) {
                user.addresses = req.body.addresses;
            }

            const updatedUser = await user.save();

            res.json({
                success: true,
                data: {
                    user: {
                        _id: updatedUser._id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        phone: updatedUser.phone,
                        addresses: updatedUser.addresses,
                        profilePicture: updatedUser.profilePicture,
                        isAdmin: updatedUser.isAdmin,
                        isActive: updatedUser.isActive
                    }
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request OTP for changing Email or Phone
// @route   POST /api/user/request-update-otp
export const requestUpdateOTP = async (req, res) => {
    try {
        const { type, value } = req.body; // type: 'email' or 'phone'

        if (!value) {
            return res.status(400).json({ message: `${type} is required` });
        }

        // Check if new value is already taken
        const query = type === 'email' ? { email: value.toLowerCase() } : { phone: value };
        const exists = await User.findOne(query);
        if (exists) {
            return res.status(400).json({ message: `This ${type} is already registered to another account` });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        user.otpHash = await bcrypt.hash(otp, salt);
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10m

        // Store the new value in a temporary field for verification
        user.pendingUpdate = { type, value };
        await user.save();

        // SECURITY: Always send OTP to the CURRENT/OLD contact info to verify it's really the account owner
        const target = type === 'phone' ? user.phone : user.email;
        const message = `Your Vincent account verification code is: ${otp}. You are updating your ${type} to ${value}.`;

        if (type === 'phone') {
            // Send SMS to current phone number
            await sendSMS(target, message);
        } else {
            // Send email to current email address
            // TODO: Implement email sending
            await sendSMS(user.phone, message); // Fallback to SMS for now
        }

        res.json({
            success: true,
            message: `OTP sent to your current ${type === 'phone' ? 'phone number' : 'email address'} for verification`
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and update Email or Phone
// @route   POST /api/user/verify-update-otp
export const verifyUpdateOTP = async (req, res) => {
    try {
        const { type, value, otp } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ message: 'OTP expired or invalid' });
        }

        // Verify that there's a pending update and it matches the request
        if (!user.pendingUpdate || user.pendingUpdate.type !== type || user.pendingUpdate.value !== value) {
            return res.status(400).json({ message: 'Invalid update request' });
        }

        const isMatch = await bcrypt.compare(otp, user.otpHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Update the field with the pending value
        if (type === 'email') {
            user.email = value.toLowerCase();
        } else if (type === 'phone') {
            user.phone = value;
        }

        // Clear OTP and pending update
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.pendingUpdate = undefined;

        await user.save();

        res.json({
            success: true,
            message: `${type} updated successfully`,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    addresses: user.addresses,
                    profilePicture: user.profilePicture,
                    birthDate: user.birthDate
                }
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
