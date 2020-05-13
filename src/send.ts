import templates from './templates'
import logger from './logger'
import { s3 } from './utils/aws'
import getContext from './context'
import * as compile from './compile'

export default async function ({ template, ...fields }: any) {
  if (!(template in templates))
    return logger.error('unknown email template', { template })

  let { markup } = templates[template]
  if (!markup)
    try {
      markup = await getTemplate(templates[template].file)
      templates[template].markup = markup
    } catch (error) {
      logger.error("couldn't download template", { template, error })
    }

  const context = await getContext(template, fields)

  const compiled = compile[templates[template].type.toLowerCase()](
    markup,
    context
  )
}

async function getTemplate(name: string) {
  const { Body } = await s3
    .getObject({ Bucket: 'upframe-email-templates', Key: name })
    .promise()
  return Body.toString()
}
