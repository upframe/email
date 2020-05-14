import loadTemplate from './build/load'
import compile from './build/compile'
import _mailgun from 'mailgun-js'
import logger from './utils/logger'

const mailgun = _mailgun({
  domain: 'upframe.io',
  apiKey: process.env.MAILGUN_KEY,
})

export default async function ({ template, ...fields }: any) {
  await loadTemplate(template)
  const { html, context } = await compile(template, fields)

  if (typeof context.to?.email !== 'string')
    throw new Error('unknown receiver address')

  const email = {
    from: 'Upframe team@upframe.io',
    to: [context.to?.name, context.to.email].filter(Boolean).join(' '),
    subject: context.subject,
    html,
  }

  try {
    const msg = await mailgun.messages().send(email)
    logger.info(msg)
  } catch (error) {
    logger.error('failed to send email', { error })
    throw error
  }
}
