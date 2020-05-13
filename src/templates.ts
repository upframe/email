export default {
  INVITE: {
    type: 'MJML',
    file: 'invite.mjml',
  },
} as { [name: string]: Template }

interface Template {
  type: 'MJML' | 'HTML'
  file: string
  markup?: string
}
