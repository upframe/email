import getContext from './context'
import * as templater from './templater'
import templates from '../templates'
import compileMJML from 'mjml'

export default async function compileTemplate(
  templateName: keyof typeof templates,
  fields: any,
  db: ReturnType<typeof import('../utils/db').default>
): Promise<{ html: string; context: any }> {
  const context = await getContext(templateName, fields, db)

  const { markup, type } = templates[templateName]

  const filledIn = templater[type === 'HTML' ? 'custom' : 'mustache'](
    markup,
    context
  )

  const { html, errors } =
    type === 'MJML'
      ? compileMJML(filledIn, { minify: !filledIn.includes('<mj-raw>') })
      : { html: filledIn, errors: [] }
  if (!html || errors.length) throw new Error(errors)

  return { html, context }
}
