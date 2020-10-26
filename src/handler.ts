import logger from './utils/logger'
import send from './send'
import connectDB from './utils/db'

export const email = async event => {
  if (process.env.IS_OFFLINE && event.Action === 'Publish')
    event = { Records: [{ Sns: event }] }
  const records = event.Records ?? []

  const db = connectDB()

  try {
    await (async () => {
      await Promise.all(
        records.map(({ Sns }) => {
          try {
            const { action, ...rest } = JSON.parse(event.Records[0].Sns.Message)
            if (typeof action !== 'string' || !(action in actions))
              return logger.info(`unknown action ${action}, ignoring message`, {
                action,
                ...rest,
              })
            return actions[action](rest, db)
          } catch (e) {
            logger.warn("couldn't parse message", { message: Sns?.Message })
          }
        })
      )
    })()
  } finally {
    await db.destroy()
  }
}

const actions = {
  async SEND_EMAIL(info, db: ReturnType<typeof connectDB>) {
    await send(info, db)
  },
}
