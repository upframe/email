import { render } from 'mustache'

export const mustache = render

export const custom = (template: string, context: object): string => {
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
