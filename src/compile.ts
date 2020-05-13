import mustache from 'mustache'
import compileMJML from 'mjml'

export const mjml = (template: string, context: object): string => {
  const { html, errors } = compileMJML(mustache.render(template, context))
  if (!html || errors.length) throw new Error(errors)
  return html
}

export const html = (template: string, context: object): string => {
  // eslint-disable-next-line no-extra-semi
  ;[...template.matchAll(/<!-- ([A-Z]+)-START -->/g)].forEach(
    ({
      0: { length: startLength },
      1: match,
      index: startIndex = Infinity,
    }) => {
      template = template.replace(
        template.substring(startIndex, startIndex + startLength),
        ''
      )
      const {
        0: { length: endLength },
        index: endIndex = Infinity,
      } = template.match(`<!-- ${match}-END -->`) as RegExpMatchArray
      template = template.replace(
        template.substring(endIndex, endIndex + endLength),
        ''
      )
      if (!context[match])
        template = template.replace(
          template.substring(startIndex, endIndex),
          ''
        )
    }
  )
  Object.entries(context)
    .filter(([, v]) => v)
    .forEach(([k, v]) => {
      template = template.replace(new RegExp(k, 'g'), v as string)
    })
  return template
}
