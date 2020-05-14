import { s3 } from '../utils/aws'
import templates from '../templates'
import logger from '../utils/logger'

export default async function loadTemplate(name: string) {
  if (!(name in templates))
    return logger.error('unknown email template', { name })

  let { markup } = templates[name]
  if (!markup)
    try {
      markup = await getTemplate(templates[name].file)
      templates[name].markup = markup
    } catch (error) {
      logger.error("couldn't download template", { name, error })
    }
  return markup
}

async function getTemplate(name: string) {
  const { Body } = await s3
    .getObject({ Bucket: 'upframe-email-templates', Key: name })
    .promise()
  return Body.toString()
}
