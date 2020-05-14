import logger from './utils/logger'
import send from './send'

export const email = async (event) => {
  if (process.env.IS_OFFLINE) event = { Records: [{ Sns: event }] }
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
}

const actions = {
  async SEND_EMAIL(info) {
    await send(info)
  },
}
