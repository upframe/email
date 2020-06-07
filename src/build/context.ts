import templates from '../templates'
import { formatDateTime, tzInfo } from '../utils/time'

export default async function (
  template: keyof typeof templates,
  fields: any,
  db: ReturnType<typeof import('../utils/db').default>
) {
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
        userId: data.id,
      }
      break
    }
    case 'RESET_EMAIL': {
      const data = await db('tokens')
        .select('tokens.*', 'users.id', 'users.name', 'users.handle')
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
        userId: data.id,
      }
      break
    }
    case 'MESSAGE': {
      const data = await db('users').whereIn('id', [
        fields.sender,
        fields.receiver,
      ])
      const [receiver] = data.splice(
        data.findIndex(({ id }) => id === fields.receiver),
        1
      )
      const [sender] = data
      if (!sender) throw Error(`can't find sender with id ${fields.sender}`)

      const subject = `${sender.name} sent you a message`

      context = {
        message: fields.message,
        replyTo: sender.email,
        ReplyLink: `mailto:${sender.email}?subject=Re: ${subject}&Body=\n\n---\n${fields.message}`,
        subject,
        to: {
          name: receiver.name.split(' ')[0],
          email: receiver.email,
        },
        from: {
          name: sender.name,
          handle: sender.handle,
          email: sender.email,
        },
        userId: receiver.id,
      }

      break
    }
    case 'SLOT_REQUEST': {
      const meetup = await db('time_slots')
        .leftJoin('meetups', 'meetups.slot_id', 'time_slots.id')
        .where({ id: fields.slot })
        .select('time_slots.*', 'meetups.message', 'meetups.location')
        .first()
      const data = await db('users').whereIn('id', [
        meetup.mentor_id,
        fields.requester,
      ])
      const [mentee] = data.splice(
        data.findIndex(({ id }) => id === fields.requester),
        1
      )
      const [mentor] = data

      const tzIana = mentor.timezone ?? 'Europe/Berlin'

      meetup.time = formatDateTime(meetup.start, tzIana)

      context = {
        replyTo: mentee.email,
        subject: `${mentee.name} invited you to a meetup`,
        to: mentor,
        userId: mentor.id,
        mentee,
        mentor,
        message: meetup.message,
        meetup,
        tz: tzInfo(tzIana),
      }
      break
    }
    case 'SLOT_CONFIRM': {
      const meetup = await db('time_slots')
        .leftJoin('meetups', 'meetups.slot_id', 'time_slots.id')
        .where({ id: fields.slot })
        .first()
      const [mentor, mentee] = await Promise.all([
        db('users').where({ id: meetup.mentor_id }).first(),
        db('users').where({ id: meetup.mentee_id }).first(),
      ])

      const tzIana = mentee.timezone ?? 'Europe/Berlin'
      meetup.time = formatDateTime(meetup.start, tzIana)

      context = {
        replyTo: mentor.email,
        subject: `${mentor.name} accepted to meetup with you`,
        to: {
          name: mentee.name,
          email: mentee.email,
        },
        userId: mentee.id,
        mentee,
        mentor,
        message: meetup.message,
        meetup,
        tz: tzInfo(tzIana),
      }
      break
    }
    default:
      throw Error(`can't provide context for ${template} template`)
  }

  return context
}
