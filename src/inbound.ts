import logger from './utils/logger'
import multipart from 'lambda-multipart-parser'

export default async event => {
  const data = await multipart.parse(event)
  logger.info(data)

  return {
    statusCode: 200,
  }
}
