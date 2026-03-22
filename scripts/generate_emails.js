const fs = require('fs');
const {
    buildWelcomeEmailHtml,
    buildResetPasswordHtml,
    buildPasswordChangedHtml,
    buildGoalAchievedHtml
} = require('../src/services/emailTemplates');

const welcome = buildWelcomeEmailHtml('Juan Perez', 'juan@example.com', 'TempPass123!');
const reset = buildResetPasswordHtml('http://localhost:5173/#reset-password?token=abcdef');
const changed = buildPasswordChangedHtml();
const goal = buildGoalAchievedHtml('Maria Gonzalez', 100, 20);

fs.writeFileSync('frontend/public/email_welcome.html', welcome);
fs.writeFileSync('frontend/public/email_reset.html', reset);
fs.writeFileSync('frontend/public/email_changed.html', changed);
fs.writeFileSync('frontend/public/email_goal.html', goal);

console.log("Emails generated successfully in frontend/public folder.");
