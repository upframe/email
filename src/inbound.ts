import logger from './utils/logger'
import replyParser from 'node-email-reply-parser'
import fetch from 'node-fetch'
import { ddb } from './utils/aws'

const POST = `
  mutation EmailReply($channel: ID!, $content: String!, $email: String!, $timestamp: String) {
    postForUser(content: $content, channel: $channel, email: $email, timestamp: $timestamp)
  }
`

export const inbound = async event => {
  try {
    const email = JSON.parse(Buffer.from(event.body, 'base64').toString())
    const sender = email.from.value[0].address
    const to = email.to.value[0].address

    if (/@reply\.upframe\.io$/.test(to)) {
      const id = email.headerLines
        .find(({ key }) => key.toLowerCase() === 'message-id')
        .line.replace(/^Message-ID:\s*<?/, '')
        .replace(/@.*/, '')

      const Item = { id, sent: Date.now(), sender }
      try {
        await ddb
          .put({
            TableName: 'email_msg_replies',
            Item,
            ConditionExpression: 'attribute_not_exists(id)',
          })
          .promise()
      } catch (e) {
        if (e.code === 'ConditionalCheckFailedException')
          logger.error('response already sent', Item)
        throw e
      }

      const channel = to.split('@')[0]
      const reply = replyParser(email.text).getVisibleText()

      const request = {
        operationName: 'EmailReply',
        query: POST,
        variables: {
          channel,
          content: reply,
          email: sender,
          timestamp: email.timestamp,
        },
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
