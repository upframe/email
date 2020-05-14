import connectDB from '../utils/db'
import templates from '../templates'

export default async function (template: keyof typeof templates, fields: any) {
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
        name: data.name,
        token: data.id,
        ...(data.role === 'mentor' && { mentor: true }),
        to: {
          email: data.email,
        },
        subject: `${data.name} invited you to join Upframe${
          data.role === 'mentor' ? ' as a mentor' : ''
        }`,
      }
      break
    }
    case 'RESET_PASSWORD': {
      const data = await db('tokens')
        .leftJoin('users', 'users.id', 'tokens.subject')
        .where({ token: fields.token })
        .first()
      if (data.scope !== 'password') throw Error('invalid token scope')
      context = {
        name: data.name,
        token: data.token,
        to: {
          name: data.name,
          email: data.email,
        },
        subject: 'Password reset link',
      }
      break
    }
    case 'RESET_EMAIL': {
      const data = await db('tokens')
        .select('tokens.*', 'users.name', 'users.handle')
        .leftJoin('users', 'users.id', 'tokens.subject')
        .where({ token: fields.token })
        .first()
      if (data.scope !== 'email') throw Error('invalid token scope')
      context = {
        name: data.name,
        handle: data.handle,
        token: data.token,
        to: {
          name: data.name,
          email: data.payload,
        },
        subject: 'Confirm your new email address',
      }
      break
    }
    default:
      throw Error(`can't provide context for ${template} template`)
  }

  await db.destroy()
  return context
}
