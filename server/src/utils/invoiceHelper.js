import nodemailer from 'nodemailer';
import sendEmail from './sendEmail.js';

export const generateAndSendInvoice = async (booking) => {
    try {
        const invoiceNumber = `INV-${booking.bookingRef}-${Date.now().toString().slice(-4)}`;
        
        // Simple HTML template for invoice
        const invoiceHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
                <h1 style="color: #333;">VINCENT - INVOICE</h1>
                <p>Invoice #: ${invoiceNumber}</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <hr/>
                <h3>Customer Details:</h3>
                <p>${booking.contactInfo.fullName}<br/>${booking.contactInfo.email}<br/>${booking.contactInfo.phone}</p>
                
                <h3>Booking Details:</h3>
                <p>Venue: ${booking.venue.name}<br/>Event Date: ${new Date(booking.eventDate).toLocaleDateString()}<br/>Status: CONFIRMED</p>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f8f8f8;">
                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd;">Description</th>
                        <th style="text-align: right; padding: 10px; border-bottom: 2px solid #ddd;">Amount</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">Venue Booking (${booking.timeSlot})</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${booking.venueTotal.toLocaleString()}</td>
                    </tr>
                    ${booking.hasCatering ? `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">Catering: ${booking.catering.packageName}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${booking.catering.total.toLocaleString()}</td>
                    </tr>
                    ` : ''}
                    ${booking.additionalServices?.length > 0 ? `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">Additional Services</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${booking.servicesTotal.toLocaleString()}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">Security Deposit (Refundable)</td>
                        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${booking.securityDeposit.toLocaleString()}</td>
                    </tr>
                    <tr style="font-weight: bold; font-size: 1.2em;">
                        <td style="padding: 10px;">Grand Total</td>
                        <td style="padding: 10px; text-align: right;">₹${booking.grandTotal.toLocaleString()}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 30px; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
                    <h2 style="color: #2e7d32; margin: 0;">PAID IN FULL</h2>
                    <p style="margin: 5px 0 0; font-size: 0.9em;">Thank you for your business!</p>
                </div>

                <p style="font-size: 0.8em; color: #777; margin-top: 30px; text-align: center;">
                    Vincent Gastronomy Cloud | GSTIN: 27AAAAA0000A1Z5<br/>
                    This is a computer-generated invoice.
                </p>
            </div>
        `;

        await sendEmail({
            email: booking.contactInfo.email,
            subject: `Final Invoice: ${booking.bookingRef} - Vincent Venues`,
            message: `Your booking for ${booking.venue.name} is now fully paid and confirmed.`,
            html: invoiceHtml
        });

        return invoiceNumber;
    } catch (err) {
        console.error('Invoice generation failed:', err);
        return null;
    }
};
