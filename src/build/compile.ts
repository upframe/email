import getContext from './context'
import * as templater from './templater'
import templates from '../templates'
import compileMJML from 'mjml'

export default async function compileTemplate(
  templateName: string,
  fields: any
): Promise<{ html: string; context: any }> {
  const context = await getContext(templateName, fields)

  const { markup, type } = templates[templateName]

  const filledIn = templater[type === 'HTML' ? 'custom' : 'mustache'](
    markup,
    context
  )

  const { html, errors } =
    type === 'MJML'
      ? compileMJML(filledIn, { minify: true })
      : { html: filledIn, errors: [] }
  if (!html || errors.length) throw new Error(errors)

  return { html, context }
}
