import logger from './utils/logger'
import replyParser from 'node-email-reply-parser'
import fetch from 'node-fetch'

const POST = `
  mutation EmailReply($channel: ID!, $content: String!, $email: String!) {
    postForUser(content: $content, channel: $channel, email: $email)
  }
`

export default async event => {
  try {
    const email = JSON.parse(Buffer.from(event.body, 'base64').toString())
    const sender = email.from.value[0].address
    const to = email.to.value[0].address

    if (/@reply\.upframe\.io$/.test(to)) {
      const channel = to.split('@')[0]
      const reply = replyParser(email.text).getVisibleText()

      const request = {
        operationName: 'EmailReply',
        query: POST,
        variables: { channel, content: reply, email: sender },
      }

      try {
        await fetch(process.env.API_URL, {
          method: 'POST',
          headers: { 'Service-Auth': process.env.EMAIL_SECRET },
          body: JSON.stringify(request),
        })
      } catch (error) {
        logger.error("couldn't post message " + error?.toString())
      }
    } else logger.warn(`invalid response address "${to}"`)
  } catch (e) {
    logger.error(e)
  }

  return {
    statusCode: 200,
  }
}
