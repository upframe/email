const templates = {
  INVITE: {
    type: 'MJML',
    file: 'invite.mjml',
  },
  RESET_PASSWORD: {
    type: 'MJML',
    file: 'reset-password.mjml',
  },
  RESET_EMAIL: {
    type: 'MJML',
    file: 'reset-email.mjml',
  },
  MESSAGE: {
    type: 'MJML',
    file: 'message.mjml',
  },
  SLOT_REQUEST: {
    type: 'MJML',
    file: 'meetup-request.mjml',
  },
  SLOT_CONFIRM: {
    type: 'MJML',
    file: 'meetup-confirm.mjml',
  },
}

export default templates as { [k in keyof typeof templates]: Template }

interface Template {
  type: 'MJML' | 'HTML'
  file: string
  markup?: string
}
