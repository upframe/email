import loadTemplate from './build/load'
import compile from './build/compile'
import logger from './utils/logger'
import mailgun from './utils/mailgun'

export default async function (
  { template, ...fields }: any,
  db: ReturnType<typeof import('./utils/db').default>
) {
  await loadTemplate(template)
  const { html, context } = await compile(template, fields, db)

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
    const id = msg.id.replace(/^<?([\w.@]+)>?$/, '$1')
    await db('emails').insert({
      id,
      template,
      subject: context.subject,
      to_user: context.userId,
      to_email: context.to.email,
    })
    await db('email_events').insert({ id, event: 'queued' })
    logger.info(msg)
  } catch (error) {
    logger.error('failed to send email', { error })
    throw error
  }
}
