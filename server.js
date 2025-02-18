require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Nodemailer Transporter with SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('invite', (room, participantSocketId) => {
        io.to(participantSocketId).emit('invitation', room);
    });

    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const sendEmailInvitation = async (recipientEmail, meetingRoomId) => {
    try {
        const meetingLink = `https://letmeet.vercel.app/${meetingRoomId}`;  
        
        const mailOptions = {
            from: `"Video Meeting Invitation" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: '📅 Invitation to Join a Video Meeting',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px;">
                    <h2 style="color: #2E86C1; text-align: center;">You're Invited to a Video Meeting! 🎥</h2>
                    
                    <p>Hello,</p>
                    
                    <p>You have been invited to join an exclusive video meeting. Please find the details below:</p>
                    
                    <div style="background: #f4f4f4; padding: 10px; border-radius: 8px;">
                        <p><strong>📅 Date:</strong> ${new Date().toDateString()}</p>
                        <p><strong>🕒 Time:</strong> ${new Date().toLocaleTimeString()}</p>
                        <p><strong>🔗 Meeting Link:</strong> <a href="${meetingLink}" style="color: #2980b9; text-decoration: none;">Click here to join</a></p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="${meetingLink}" style="background: #2980b9; color: #ffffff; padding: 10px 20px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
                            Join Meeting Now
                        </a>
                    </p>
                    
                    <p>If you have any issues joining the meeting, please contact the meeting organizer.</p>
                    
                    <p>Best regards,</p>
                    <p><strong>Video Meeting Team</strong></p>
                </div>
            `,
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.response);
        return { success: true, message: 'Invitation sent successfully!' };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, message: 'Failed to send invitation.', error };
    }
};


// API Endpoint for Sending Invitations
app.post('/send-invite', async (req, res) => {
    const { recipientEmail, meetingRoomId } = req.body;

    if (!recipientEmail || !meetingRoomId) {
        return res.status(400).json({ error: 'Missing recipientEmail or meetingRoomId' });
    }

    const result = await sendEmailInvitation(recipientEmail, meetingRoomId);
    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(500).json(result);
    }
});

// Start Server
server.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
});
