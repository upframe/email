import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_KEY)

export default sgMail
