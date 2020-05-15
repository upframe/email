require('dotenv').config()
const fs = require('fs')

const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_KEY,
  domain: process.env.DOMAIN,
})

const register = async (id) =>
  await mailgun.post(`/domains/${process.env.DOMAIN}/webhooks`, {
    id,
    url: [process.env.BASE_URL + id],
  })
const remove = async (id) =>
  await mailgun.delete(`/domains/${process.env.DOMAIN}/webhooks/${id}`)

;(async () => {
  try {
    const hooks = fs
      .readFileSync('./src/handler.ts', 'utf-8')
      .match(/const hooks.*\n\}\n/s)[0]
      .split('\n')
      .slice(1, -1)
      .join('\n')
      .match(/(^|\n)\s*(async)?\s*\w+\([\w,]*\)\s*\{/g)
      .map((v) => v.match(/\w+(?=\()/)[0])

    const registered = Object.keys(
      (await mailgun.get(`/domains/${process.env.DOMAIN}/webhooks`)).webhooks
    )

    const addHooks = hooks.filter((hook) => !registered.includes(hook))
    const removeHooks = registered.filter((hook) => !hooks.includes(hook))

    console.log(`required hooks:   [${hooks.join(', ')}]`)
    console.log(`registered hooks: [${registered}]`)
    console.log(`register hooks:   [${addHooks.join(', ')}]`)
    console.log(`remove hooks:     [${removeHooks.join(', ')}]`)

    await Promise.all([...addHooks.map(register), ...removeHooks.map(remove)])
  } catch (e) {
    console.error(e)
    throw e
  }
})()
