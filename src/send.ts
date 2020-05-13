import templates from './templates'
import logger from './logger'
import { s3 } from './utils/aws'

export default async function (template: string) {
  if (!(template in templates))
    return logger.error('unknown email template', { template })

  let markup: string
  try {
    markup = await getTemplate(templates[template].file)
  } catch (error) {
    logger.error("couldn't download template", { template, error })
  }

  logger.info(markup)
}

async function getTemplate(name: string) {
  const { Body } = await s3
    .getObject({ Bucket: 'upframe-email-templates', Key: name })
    .promise()
  return Body.toString()
}
