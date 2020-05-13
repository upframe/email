import logger from './logger'
import send from './send'

export const email = (event) => {
  const records = event.Records ?? []
  records.forEach(({ Sns }) => {
    try {
      const { action, ...rest } = JSON.parse(event.Records[0].Sns.Message)
      if (typeof action !== 'string' || !(action in actions))
        return logger.info(`unknown action ${action}, ignoring message`)
      actions[action](rest)
    } catch (e) {
      logger.warn("couldn't parse message", { message: Sns?.Message })
    }
  })
}

const actions = {
  SEND_EMAIL({ template }) {
    send(template)
  },
}
