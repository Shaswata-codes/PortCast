import nodemailer from 'nodemailer';


export const handleLoginNotification = async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // Sending to the user who logged in (or you could send it to yourself)
      subject: 'Welcome back to PortCast!',
      text: `Hi ${name},\n\nYou have successfully logged into PortCast.\n\nThank you for using our maritime intelligence platform!`
    };

    // Attempt to send email, but don't block the response if credentials aren't set up yet
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
      await transporter.sendMail(mailOptions);
      console.log(`Login notification email sent to ${email}`);
    } else {
      console.log(`Email credentials not configured. Skipping email to ${email}`);
    }

    res.status(200).json({ success: true, message: 'Notification processed' });
  } catch (error) {
    console.error('Error sending email:', error);
    // Still return 200 so the frontend login flow doesn't break
    res.status(200).json({ success: false, message: 'Failed to send email' });
  }
};
