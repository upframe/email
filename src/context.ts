import connectDB from './db'

export default async function (template, fields) {
  const db = connectDB()

  let context = {}
  switch (template) {
    case 'INVITE': {
      if (!fields.invite) throw new Error('must provide invite id')
      const data = await db('invites')
        .leftJoin('users', 'users.id', 'invites.issuer')
        .select('invites.*', 'users.name', 'users.handle')
        .where('invites.id', '=', fields.invite)
        .first()
      context = {
        handle: data.handle,
        name: data.handle,
        token: data.id,
        ...(data.role === 'mentor' && { mentor: true }),
      }
      break
    }
    default:
      throw Error(`can't provide context for ${template} template`)
  }

  await db.destroy()
  return context
}
