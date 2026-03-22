const { sendPasswordResetEmail } = require('../src/services/emailService');

async function testEmail() {
    console.log("Starting email test...");
    try {
        await sendPasswordResetEmail('emmanuel.ulloa@partido360.com', 'test-token-1234');
        console.log("Email sent successfully!");
    } catch (e) {
        console.error("Error sending email:", e);
    }
}

testEmail();
