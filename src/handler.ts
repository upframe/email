import logger from './utils/logger'
import send from './send'

export const email = async (event) => {
  if (process.env.IS_OFFLINE && event.Action === 'Publish')
    event = { Records: [{ Sns: event }] }
  const records = event.Records ?? []

  await Promise.all(
    records.map(({ Sns }) => {
      try {
        const { action, ...rest } = JSON.parse(event.Records[0].Sns.Message)
        if (typeof action !== 'string' || !(action in actions))
          return logger.info(`unknown action ${action}, ignoring message`)
        return actions[action](rest)
      } catch (e) {
        logger.warn("couldn't parse message", { message: Sns?.Message })
      }
    })
  )

  const { event: hook } = event.pathParameters
  if (!hook) return
  if (!(hook in hooks)) {
    logger.warn('unknown webhook called', { hook })
    return { statusCode: 404 }
  }
  await hooks[hook](event)
  return { statusCode: 200 }
}

const actions = {
  async SEND_EMAIL(info) {
    await send(info)
  },
}

const hooks = {
  delivered(event) {
    logger.info('webhook called', { hook: 'delivered', event })
  },
}
