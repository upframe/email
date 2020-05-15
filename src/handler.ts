import logger from './utils/logger'
import send from './send'
import connectDB from './utils/db'
import mailgun from './utils/mailgun'

export const email = async (event) => {
  if (process.env.IS_OFFLINE && event.Action === 'Publish')
    event = { Records: [{ Sns: event }] }
  const records = event.Records ?? []

  const db = connectDB()
  let statusCode: number

  try {
    statusCode = await (async () => {
      await Promise.all(
        records.map(({ Sns }) => {
          try {
            const { action, ...rest } = JSON.parse(event.Records[0].Sns.Message)
            if (typeof action !== 'string' || !(action in actions))
              return logger.info(`unknown action ${action}, ignoring message`)
            return actions[action](rest, db)
          } catch (e) {
            logger.warn("couldn't parse message", { message: Sns?.Message })
          }
        })
      )

      const { event: hook } = event.pathParameters ?? {}
      if (!hook) return
      if (!(hook in hooks)) {
        logger.warn('unknown webhook called', { hook })
        return 406
      }
      const body = JSON.parse(event.body)
      if (
        !mailgun.validateWebhook(body.timestamp, body.token, body.signature)
      ) {
        logger.error('illegal webhook invocation', body)
        return 401
      }
      await hooks[hook](event)
      await db('email_events').insert({
        id: body['message-id'].replace(/^<?([\w.@]+)>?$/, '$1'),
        event: hook,
      })
      return 200
    })()
  } finally {
    await db.destroy()
    // eslint-disable-next-line no-unsafe-finally
    if (statusCode) return { statusCode }
  }
}

const actions = {
  async SEND_EMAIL(info, db: ReturnType<typeof connectDB>) {
    await send(info, db)
  },
}

const hooks = {
  delivered(body) {
    logger.info('delivered', body)
  },

  complained(body) {
    logger.warn('marked as spam', body)
  },

  temporary_fail(body) {
    logger.warn('soft bounce', body)
  },

  permanent_fail(body) {
    logger.warn('hard bounce', body)
  },
}
