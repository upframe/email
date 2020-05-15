import mailgun from 'mailgun-js'

export default mailgun({
  domain: 'upframe.io',
  apiKey: process.env.MAILGUN_KEY,
})
