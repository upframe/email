import loadTemplate from './build/load'
import compile from './build/compile'
import logger from './utils/logger'
import { ddb } from './utils/aws'
import sg from './utils/sendGrid'

export default async function (
  { template, ...fields }: any,
  db: ReturnType<typeof import('./utils/db').default>
) {
  await loadTemplate(template)
  const { html, context } = await compile(template, fields, db)

  if (typeof context.to?.email !== 'string')
    throw new Error('unknown receiver address')

  const email = {
    from: {
      email: context.sender?.email ?? 'team@upframe.io',
      name: context.sender?.name ?? 'Upframe',
    },
    to: {
      email: context.to.email,
      name: context.to.name,
    },
    subject: context.subject,
    replyTo: context.replyTo,
    html,
  }

  try {
    const [msg] = await sg.send(email)
    const id = msg.headers['x-message-id']
    await db('emails').insert({
      id,
      template,
      subject: context.subject,
      to_user: context.userId,
      to_email: context.to.email,
    })
    await db('email_events').insert({ id, event: 'queued' })

    if (template === 'INVITE')
      await db('invites').update('email_id', id).where('id', '=', context.token)

    if (template === 'THREAD_MSGS') {
      await ddb
        .update({
          TableName: 'connections',
          Key: { pk: `USER|${fields.user}`, sk: 'meta' },
          UpdateExpression: `REMOVE #arn, #pending`,
          ExpressionAttributeNames: {
            '#arn': `mail_arn_channel_${fields.channel}`,
            '#pending': `mail_pending_channel_${fields.channel}`,
          },
        })
        .promise()
    }
  } catch (error) {
    logger.error('failed to send email', { error })
    throw error
  }
}
