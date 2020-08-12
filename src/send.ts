import loadTemplate from './build/load'
import compile from './build/compile'
import logger from './utils/logger'
import { ddb } from './utils/aws'
import sg from './utils/sendGrid'
import token from './utils/token'

export default async function (
  { template, ...fields }: any,
  db: ReturnType<typeof import('./utils/db').default>
) {
  await loadTemplate(template)
  const { html, context } = await compile(template, fields, db)

  if (typeof context.to?.email !== 'string')
    throw new Error('unknown receiver address')

  const msgId = context.unsubToken ?? token()
  const to = {
    email: context.to.email,
    name: context.to.name,
  }
  const email: Parameters<typeof sg['send']>[0] = {
    from: {
      email: context.sender?.email ?? 'team@upframe.io',
      name: context.sender?.name ?? 'Upframe',
    },
    to,
    subject: context.subject,
    replyTo: context.replyTo,
    html,
    customArgs: { msgId },
    ...(context.unsubToken && {
      headers: {
        'List-Unsubscribe': `<https://upframe.io/settings/notifications?unsubscribe=${context.unsubToken}>`,
      },
    }),
  }

  try {
    const [msg] = await sg.send({ ...email })
    logger.info(msg)
    await db('emails').insert({
      id: msgId,
      template,
      subject: context.subject,
      to_user: context.userId,
      to_email: context.to.email,
    })
    await db('email_events').insert({ id: msgId, event: 'queued' })

    if (template === 'INVITE')
      await db('invites')
        .update('email_id', msgId)
        .where('id', '=', context.token)

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
