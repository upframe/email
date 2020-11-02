import templates from '../templates'
import { formatDateTime, formatTime, tzInfo } from '../utils/time'
import { ddb } from '../utils/aws'
const markdownIt = require('markdown-it')
import token from '../utils/token'

const md = new markdownIt()

export default async function (
  template: keyof typeof templates,
  fields: any,
  db: ReturnType<typeof import('../utils/db').default>
) {
  let context: any = {}
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
          data.role === 'mentor' ? ' as a mentor' : '8'
        }`,
      }
      break
    }

    case 'SPACE_INVITE': {
      if (!fields.invite) throw new Error('must provide invite id')
      context = await db('space_invites')
        .leftJoin('spaces', { 'spaces.id': 'space_invites.space' })
        .leftJoin('invites', { 'invites.id': 'space_invites.id' })
        .leftJoin('users', { 'users.id': 'invites.issuer' })
        .where({ 'space_invites.id': fields.invite })
        .select(
          'space_invites.*',
          'invites.email',
          'space_invites.mentor',
          'space_invites.owner',
          'spaces.space_imgs',
          'spaces.id as spaceId',
          'spaces.name as spaceName',
          'spaces.handle as spaceHandle',
          'users.name as userName',
          'users.handle as userHandle'
        )
        .first()
      context.role = context.owner
        ? 'owner'
        : context.mentor
        ? 'mentor'
        : 'founder'

      const img = (context.space_imgs as string[])
        ?.filter(v => v.endsWith('.jpeg'))
        ?.sort(
          (a, b) =>
            parseInt(a.match(/-(\d+)/)?.[1]) - parseInt(b.match(/-(\d+)/)?.[1])
        )?.[0]
      context.logo = img
        ? `https://d1misjhz20pz2i.cloudfront.net/spaces/${context.spaceId}/` +
          img
        : 'https://beta.upframe.io/emailLogo.png'

      context.token = context.id
      context.subject = `${context.userName} invited you to join the ${context.spaceName} space on Upframe`
      context.to = {
        email: context.email,
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

    case 'THREAD_MSGS': {
      const { Item: ddbUser } = await ddb
        .get({
          TableName: 'connections',
          Key: { pk: `USER|${fields.user}`, sk: 'meta' },
        })
        .promise()

      if (!ddbUser.subEmail)
        throw Error(`user ${fields.user} doesn't want email notifications`)

      const pending = JSON.parse(
        JSON.stringify(ddbUser[`mail_pending_channel_${fields.channel}`])
      )

      if (!pending?.length) throw Error('no pending messages')

      const {
        Responses: { conversations: msgs },
      } = await ddb
        .batchGet({
          RequestItems: {
            conversations: {
              Keys: pending.map(id => ({
                pk: `CHANNEL|${fields.channel}`,
                sk: `MSG|${id}`,
              })),
            },
          },
        })
        .promise()

      const userIds = Array.from(
        new Set([fields.user, ...msgs.map(({ author }) => author)])
      )
      const userInfo = await db('users')
        .select(
          'users.id',
          'users.handle',
          'users.name',
          'users.display_name',
          'users.timezone',
          'users.email',
          'profile_pictures.*'
        )
        .leftJoin(
          'profile_pictures',
          'profile_pictures.user_id',
          '=',
          'users.id'
        )
        .whereIn('id', userIds)

      const users = userIds.map(id => userInfo.find(user => user.id === id))
      users.forEach(user => {
        user.photos = userInfo
          .filter(({ id, type }) => id === user.id && type === 'jpeg')
          .sort((a, b) => a.size - b.size)
      })
      users.forEach(user => {
        user.photo =
          user.photos[0]?.url ?? process.env.BUCKET_URL + 'default.png'
      })

      const messages = msgs.sort((a, b) => a.time - b.time)

      for (const msg of messages) {
        msg.content = [md.render(msg.content)]
      }

      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].author !== messages[i + 1].author) continue
        messages[i].content.push(...messages.splice(i + 1, 1)[0].content)
        i--
      }

      const user = users.find(({ id }) => id === fields.user)
      const tz = user.timezone ?? 'Europe/Berlin'
      for (const msg of messages) {
        msg.author = users.find(({ id }) => id === msg.author)
        const time = msg.time
        msg.time = formatTime(time, tz)
        msg.fulltime = `${formatDateTime(time, tz)} ${tzInfo(tz).abbr}`
      }

      const { Item: channel } = await ddb
        .get({
          TableName: 'conversations',
          Key: { pk: `CHANNEL|${fields.channel}`, sk: 'meta' },
        })
        .promise()

      const newStr = `You have ${msgs.length} new message${
        msgs.length > 1 ? 's' : ''
      }`

      const authors = users.filter(({ id }) => id !== fields.user)

      const replyTo = `${fields.channel}@reply.upframe.io`
      const subject = newStr + ' on Upframe'

      context = {
        to: {
          ...user,
          displayName: user.display_name ?? user.name.split(' ')[0],
        },
        userId: user.id,
        subject,
        channel: {
          id: fields.channel,
        },
        conversation: {
          id: channel.conversation,
        },
        messages,
        newStr,
        sender: {
          name: authors.length === 1 ? authors[0].name : undefined,
          email: 'notifications@upframe.io',
        },
        replyTo,
        replyAddress: `${replyTo}?subject=Re:%20${encodeURIComponent(subject)}`,
        timestamp: new Date().toISOString(),
        unsubToken: token(),
      }

      break
    }

    default:
      throw Error(`can't provide context for ${template} template`)
  }

  return context
}
